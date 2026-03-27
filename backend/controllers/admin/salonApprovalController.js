/*
  Admin Salon Approval Controller
  Handles:
  - Get pending salons
  - Approve salons
  - Reject salons
  - Get approved salons
*/

const Salon = require('../../models/Salon');
const Owner = require('../../models/Owner');

const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const messages = require('../../utils/messages');


// ===================================================
// GET PENDING SALONS
// ===================================================
const getPendingSalons = async (req, res) => {
  try {

    const { page = 1, limit = 10 } = req.query;

    const salons = await Salon.find({ approvalStatus: "pending" })
      .populate("ownerId", "name phone email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Salon.countDocuments({ approvalStatus: "pending" });

    res.json(
      formatSuccessResponse({
        salons,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }, messages.GENERIC.RETRIEVED)
    );

  } catch (error) {

    console.error("Error fetching pending salons:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// APPROVE SALON
// ===================================================
const approveSalon = async (req, res) => {

  try {

    const { salonId } = req.params;
    const { notes } = req.body;

    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    salon.approvalStatus = "approved";
    salon.isApproved = true;
    salon.approvedBy = req.admin._id;
    salon.approvedDate = new Date();

    if (notes) salon.adminNotes = notes;

    await salon.save();


    // update owner
    const owner = await Owner.findById(salon.ownerId);

    if (owner) {
      owner.status = "approved";
      owner.approvalStatus = "approved";
      owner.approvalDate = new Date();
      owner.approvedBy = req.admin._id;

      await owner.save();
    }

    res.json(
      formatSuccessResponse(salon, messages.SALON.SALON_APPROVED)
    );

  } catch (error) {

    console.error("Error approving salon:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// REJECT SALON
// ===================================================
const rejectSalon = async (req, res) => {

  try {

    const { salonId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json(
        formatErrorResponse("Rejection reason is required", 400)
      );
    }

    const salon = await Salon.findById(salonId);

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    salon.approvalStatus = "rejected";
    salon.isApproved = false;
    salon.rejectionReason = reason;
    salon.approvedBy = req.admin._id;

    await salon.save();


    const owner = await Owner.findById(salon.ownerId);

    if (owner) {
      owner.approvalStatus = "rejected";
      owner.rejectionReason = reason;

      await owner.save();
    }

    res.json(
      formatSuccessResponse(salon, messages.SALON.SALON_REJECTED)
    );

  } catch (error) {

    console.error("Error rejecting salon:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// GET APPROVED SALONS
// ===================================================
const getApprovedSalons = async (req, res) => {

  try {

    const { page = 1, limit = 10 } = req.query;

    const salons = await Salon.find({
      approvalStatus: "approved",
      isApproved: true
    })
      .populate("ownerId", "name phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Salon.countDocuments({
      approvalStatus: "approved"
    });

    res.json(
      formatSuccessResponse({
        salons,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      }, messages.GENERIC.RETRIEVED)
    );

  } catch (error) {

    console.error("Error fetching approved salons:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};



// ===================================================
// EXPORT CONTROLLER FUNCTIONS
// ===================================================
module.exports = {
  getPendingSalons,
  approveSalon,
  rejectSalon,
  getApprovedSalons
};