const Feedback = require('../models/Feedback');
const Customer = require('../models/Customer');
const Owner = require('../models/Owner');
const { formatSuccessResponse, formatErrorResponse, formatPaginatedResponse } = require('../utils/formatters');
const { sendExpoPush } = require('../utils/pushNotification');

const SPAM_LIMIT = 5;
const SPAM_WINDOW_MS = 60 * 60 * 1000;

// ===================================================
// SUBMIT FEEDBACK (customer or owner)
// ===================================================
const submitFeedback = async (req, res) => {
  try {
    const { type, severity, subject, description, platform, appVersion, osVersion, deviceInfo } = req.body;

    if (!subject || !description) {
      return res.status(400).json(formatErrorResponse('Subject and description are required', 400));
    }

    const isOwner = !!req.owner;
    const userId = req.user._id;
    const userType = isOwner ? 'Owner' : 'Customer';

    const sourceSurface = `${isOwner ? 'owner' : 'customer'}_${platform === 'android' ? 'android' : 'web'}`;

    const recentCount = await Feedback.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - SPAM_WINDOW_MS) },
    });
    if (recentCount >= SPAM_LIMIT) {
      return res.status(429).json(formatErrorResponse('Too many submissions. Please try again later.', 429));
    }

    const Model = isOwner ? Owner : Customer;
    const account = await Model.findById(userId).select('name phone');

    let screenshotUrl;
    if (req.file) {
      const { cloudinary } = require('../config/cloudinary');
      screenshotUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'smart-salon/feedback', resource_type: 'image' },
          (error, result) => { if (error) reject(error); else resolve(result.secure_url); }
        );
        stream.end(req.file.buffer);
      });
    }

    const feedback = await Feedback.create({
      userId,
      userType,
      userName: account?.name,
      userPhone: account?.phone || req.user.phone,
      type: ['bug', 'suggestion', 'feedback'].includes(type) ? type : 'feedback',
      severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'low',
      subject,
      description,
      screenshotUrl,
      sourceSurface,
      appVersion,
      osVersion,
      deviceInfo,
    });

    return res.status(201).json(formatSuccessResponse(feedback, 'Feedback submitted successfully', 201));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error.message, 500));
  }
};

// ===================================================
// MY SUBMISSIONS (customer or owner)
// ===================================================
const getMyFeedback = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);

    const filter = { userId: req.user._id };

    const [items, total] = await Promise.all([
      Feedback.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Feedback.countDocuments(filter),
    ]);

    return res.json(formatPaginatedResponse(items, total, page, limit));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error.message, 500));
  }
};

// ===================================================
// REOPEN (customer or owner)
// ===================================================
const reopenFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ _id: req.params.id, userId: req.user._id });
    if (!feedback) return res.status(404).json(formatErrorResponse('Feedback not found', 404));

    if (!['resolved', 'closed'].includes(feedback.status)) {
      return res.status(400).json(formatErrorResponse('Only resolved or closed submissions can be reopened', 400));
    }

    feedback.status = 'open';
    feedback.resolvedAt = undefined;
    await feedback.save();

    return res.json(formatSuccessResponse(feedback, 'Feedback reopened'));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error.message, 500));
  }
};

// ===================================================
// ADMIN: LIST ALL
// ===================================================
const getAllFeedback = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const { status, type, severity, sourceSurface, q, sort } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (sourceSurface) filter.sourceSurface = sourceSurface;
    if (q) {
      const re = new RegExp(q, 'i');
      filter.$or = [{ subject: re }, { description: re }, { userName: re }, { userPhone: re }];
    }

    let sortSpec = { createdAt: -1 };
    if (sort === 'oldest') sortSpec = { createdAt: 1 };
    if (sort === 'severity') sortSpec = { severity: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Feedback.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit),
      Feedback.countDocuments(filter),
    ]);

    return res.json(formatPaginatedResponse(items, total, page, limit));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error.message, 500));
  }
};

// ===================================================
// ADMIN: UPDATE STATUS / NOTES
// ===================================================
const updateFeedbackStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json(formatErrorResponse('Feedback not found', 404));

    const prevStatus = feedback.status;

    if (status && ['open', 'in_review', 'resolved', 'closed'].includes(status)) {
      feedback.status = status;
      feedback.resolvedAt = ['resolved', 'closed'].includes(status) ? new Date() : undefined;
    }
    if (adminNotes !== undefined) feedback.adminNotes = adminNotes;

    await feedback.save();

    if (status && status !== prevStatus) {
      const Model = feedback.userType === 'Owner' ? Owner : Customer;
      Model.findById(feedback.userId).select('pushToken').then((account) => {
        if (account?.pushToken) {
          sendExpoPush(
            account.pushToken,
            'Feedback update',
            `Your feedback "${feedback.subject}" is now ${status.replace('_', ' ')}.`,
            { feedbackId: feedback._id.toString(), type: 'feedback_status' },
            { channelId: 'reminders' }
          ).catch(() => {});
        }
      }).catch(() => {});
    }

    return res.json(formatSuccessResponse(feedback, 'Feedback updated'));
  } catch (error) {
    return res.status(500).json(formatErrorResponse(error.message, 500));
  }
};

module.exports = {
  submitFeedback,
  getMyFeedback,
  reopenFeedback,
  getAllFeedback,
  updateFeedbackStatus,
};
