// resolveSalon — resolves the active salon for multi-location owners
// Reads X-Salon-ID header or salonId query param.
// Falls back to first businessId for single-location owners.
// Attaches req.activeSalonId (string ObjectId).

const { formatErrorResponse } = require('../utils/formatters');
const mongoose = require('mongoose');

const resolveSalon = async (req, res, next) => {
  try {
    const owner = req.owner;
    if (!owner) return next(); // non-owner routes skip this

    const Owner = require('../models/Owner');
    const ownerDoc = await Owner.findById(owner._id).select('businessId businessIds').lean();

    // Support both single (legacy) and multi-location
    const businessIds = ownerDoc?.businessIds?.length
      ? ownerDoc.businessIds.map(String)
      : ownerDoc?.businessId
        ? [String(ownerDoc.businessId)]
        : [];

    if (!businessIds.length) {
      // Owner hasn't completed onboarding — no business yet, allow through
      req.activeSalonId = null;
      req.owner.businessId = null;
      return next();
    }

    // Determine which salon is being targeted
    const requested = req.headers['x-salon-id'] || req.query.salonId || req.body?.salonId;

    if (requested) {
      if (!mongoose.Types.ObjectId.isValid(requested)) {
        return res.status(400).json(formatErrorResponse('Invalid X-Salon-ID format', 400));
      }
      if (!businessIds.includes(String(requested))) {
        return res.status(403).json(formatErrorResponse('You do not own this business', 403));
      }
      req.activeSalonId = requested;
    } else {
      // Default to first (or only) business
      req.activeSalonId = businessIds[0];
    }

    // Back-compat: keep req.owner.businessId pointing to active salon
    req.owner.businessId = req.activeSalonId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { resolveSalon };
