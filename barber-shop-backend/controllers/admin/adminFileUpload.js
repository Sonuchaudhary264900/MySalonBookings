// controllers/admin/salonApprovalController.js & controllers/common/fileUploadController.js

const Salon = require('../../models/Salon');
const Owner = require('../../models/Owner');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const messages = require('../../utils/messages');
const { uploadImage, deleteImage } = require('../../config/cloudinary');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════
// ADMIN SALON APPROVAL CONTROLLER
// ═══════════════════════════════════════════════════════════════

// ===================================================
// GET PENDING SALONS
// ===================================================
exports.getPendingSalons = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const salons = await Salon.find({ approvalStatus: 'pending' })
      .populate('ownerId', 'name phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Salon.countDocuments({ approvalStatus: 'pending' });

    res.json(
      formatSuccessResponse(
        {
          salons,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
          },
        },
        messages.GENERIC.RETRIEVED
      )
    );
  } catch (error) {
    console.error('Error fetching pending salons:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// APPROVE SALON
// ===================================================
exports.approveSalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { notes } = req.body;

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    // Update salon
    salon.approvalStatus = 'approved';
    salon.isApproved = true;
    salon.approvedBy = req.admin._id;
    salon.approvedDate = new Date();
    if (notes) salon.adminNotes = notes;
    await salon.save();

    // Update owner
    const owner = await Owner.findById(salon.ownerId);
    owner.status = 'approved';
    owner.approvalStatus = 'approved';
    owner.approvalDate = new Date();
    owner.approvedBy = req.admin._id;
    await owner.save();

    // Send approval email
    try {
      // TODO: Send email to owner about salon approval
    } catch (error) {
      console.error('Error sending email:', error);
    }

    res.json(
      formatSuccessResponse(salon, messages.SALON.SALON_APPROVED)
    );
  } catch (error) {
    console.error('Error approving salon:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// REJECT SALON
// ===================================================
exports.rejectSalon = async (req, res) => {
  try {
    const { salonId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(
        formatErrorResponse('Rejection reason is required', 400)
      );
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    // Update salon
    salon.approvalStatus = 'rejected';
    salon.isApproved = false;
    salon.rejectionReason = reason;
    salon.approvedBy = req.admin._id;
    await salon.save();

    // Update owner
    const owner = await Owner.findById(salon.ownerId);
    owner.approvalStatus = 'rejected';
    owner.rejectionReason = reason;
    await owner.save();

    res.json(
      formatSuccessResponse(salon, messages.SALON.SALON_REJECTED)
    );
  } catch (error) {
    console.error('Error rejecting salon:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// GET ALL APPROVED SALONS (For admin dashboard)
// ===================================================
exports.getApprovedSalons = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const salons = await Salon.find({ approvalStatus: 'approved', isApproved: true })
      .populate('ownerId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Salon.countDocuments({ approvalStatus: 'approved' });

    res.json(
      formatSuccessResponse(
        {
          salons,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
          },
        },
        messages.GENERIC.RETRIEVED
      )
    );
  } catch (error) {
    console.error('Error fetching approved salons:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD CONTROLLER
// ═══════════════════════════════════════════════════════════════

// ===================================================
// UPLOAD SINGLE IMAGE
// ===================================================
exports.uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.FILE_REQUIRED, 400)
      );
    }

    // Upload to Cloudinary
    const result = await uploadImage(req.file.path);

    // Delete temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.json(
      formatSuccessResponse(
        {
          url: result.secure_url,
          publicId: result.public_id,
        },
        'Image uploaded successfully'
      )
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.FILE_UPLOAD_FAILED, 500)
    );
  }
};

// ===================================================
// UPLOAD MULTIPLE IMAGES
// ===================================================
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.FILE_REQUIRED, 400)
      );
    }

    const uploadedImages = [];

    for (const file of req.files) {
      try {
        const result = await uploadImage(file.path);
        uploadedImages.push({
          url: result.secure_url,
          publicId: result.public_id,
        });

        // Delete temp file
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    if (uploadedImages.length === 0) {
      return res.status(500).json(
        formatErrorResponse(messages.GENERIC.FILE_UPLOAD_FAILED, 500)
      );
    }

    res.json(
      formatSuccessResponse(
        { images: uploadedImages, uploaded: uploadedImages.length },
        'Images uploaded successfully'
      )
    );
  } catch (error) {
    console.error('Error uploading images:', error);
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting temp file:', err);
        });
      });
    }
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.FILE_UPLOAD_FAILED, 500)
    );
  }
};

// ===================================================
// DELETE IMAGE
// ===================================================
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json(
        formatErrorResponse('Public ID is required', 400)
      );
    }

    await deleteImage(publicId);

    res.json(
      formatSuccessResponse(null, 'Image deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

module.exports = {
  // Admin
  getPendingSalons,
  approveSalon,
  rejectSalon,
  getApprovedSalons,

  // File Upload
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
};
