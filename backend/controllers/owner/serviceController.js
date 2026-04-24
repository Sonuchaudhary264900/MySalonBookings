// controllers/owner/serviceController.js
const Service = require('../../models/Service');
const Business = require('../../models/Business');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateServiceData } = require('../../utils/validators');
const messages = require('../../utils/messages');

// ── Normalize applicableFor ─────────────────────────────────────────────────
// Accepts: ['male'], ['female'], ['male','female'], ['unisex'], 'unisex', []
// Always returns a clean array of only 'male' and/or 'female'.
function normalizeApplicableFor(raw, salonServedGender) {
  const input = Array.isArray(raw) ? raw : (raw ? [raw] : []);

  // Treat 'unisex' value as both
  if (input.includes('unisex') || input.includes('both')) {
    return ['male', 'female'];
  }

  const valid = input.filter(g => g === 'male' || g === 'female');
  if (valid.length > 0) return valid;

  // Default by salon gender when nothing valid provided
  if (salonServedGender === 'female') return ['female'];
  if (salonServedGender === 'unisex') return ['male', 'female'];
  return ['male'];
}

// ===================================================
// CREATE SERVICE
// ===================================================
exports.createService = async (req, res) => {
  try {
    const { name, description, category, basePrice, duration, variants, applicableFor, photos } = req.body;

    const validation = validateServiceData({ name, basePrice, duration });
    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    const salon = await Business.findOne({ ownerId: req.owner._id });
    if (!salon) {
      return res.status(404).json(formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404));
    }

    const normalizedApplicableFor = normalizeApplicableFor(applicableFor, salon.servedGender);

    // Prevent duplicate service name within same salon
    const dupe = await Service.findOne({ salonId: salon._id, name: name.trim() });
    if (dupe) {
      return res.status(409).json(
        formatErrorResponse('A service with this name already exists. Update the existing one instead.', 409)
      );
    }

    const service = await Service.create({
      name,
      description: description || '',
      salonId: salon._id,
      category: category || 'haircut',
      basePrice,
      duration,
      variants: variants || [],
      applicableFor: normalizedApplicableFor,
      isActive: true,
      photos: Array.isArray(photos) ? photos.slice(0, 1) : [],
    });

    if (!salon.services.includes(service._id)) {
      salon.services.push(service._id);
    }
    await salon.save();

    res.status(201).json(
      formatSuccessResponse(service, messages.SERVICE.SERVICE_CREATED, 201)
    );
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// GET SALON'S SERVICES
// ===================================================
exports.getSalonServices = async (req, res) => {
  try {
    const salon = await Business.findOne({ $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }] });
    if (!salon) {
      return res.status(404).json(formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404));
    }

    const { page = 1, limit = 100 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(200, Math.max(1, parseInt(limit)));

    const [services, total] = await Promise.all([
      Service.find({ salonId: salon._id, deletedAt: null })
        .sort({ isActive: -1, createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Service.countDocuments({ salonId: salon._id, deletedAt: null }),
    ]);

    res.json(
      formatSuccessResponse({ services, total, page: p, limit: l }, messages.GENERIC.RETRIEVED)
    );
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json(
      formatErrorResponse(`${messages.GENERIC.ERROR} [DEBUG: ${error.name}: ${error.message}]`, 500)
    );
  }
};

// ===================================================
// UPDATE SERVICE
// ===================================================
exports.updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { name, description, category, basePrice, duration, variants, isActive, applicableFor, photos } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json(formatErrorResponse(messages.SERVICE.SERVICE_NOT_FOUND, 404));
    }

    const salon = await Business.findById(service.salonId);
    if (!salon || salon.ownerId.toString() !== req.owner._id.toString()) {
      return res.status(403).json(formatErrorResponse(messages.GENERIC.FORBIDDEN, 403));
    }

    if (name)                    service.name        = name;
    if (description !== undefined) service.description = description;
    if (category !== undefined)  service.category    = category;
    if (basePrice !== undefined) service.basePrice   = basePrice;
    if (duration !== undefined)  service.duration    = duration;
    if (variants)                service.variants    = variants;
    if (isActive !== undefined)  service.isActive    = isActive;

    if (applicableFor !== undefined) {
      service.applicableFor = normalizeApplicableFor(applicableFor, salon.servedGender);
    }
    if (photos !== undefined) service.photos = Array.isArray(photos) ? photos.slice(0, 1) : [];

    await service.save();

    res.json(formatSuccessResponse(service, messages.SERVICE.SERVICE_UPDATED));
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// BULK UPSERT SERVICES
// ===================================================
exports.bulkUpsertServices = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json(formatErrorResponse('No updates provided', 400));
    }

    const salon = await Business.findOne({ ownerId: req.owner._id });
    if (!salon) return res.status(404).json(formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404));

    let created = 0, updated = 0;
    for (const u of updates) {
      if (u.id) {
        await Service.findOneAndUpdate(
          { _id: u.id, salonId: salon._id },
          { ...(u.basePrice !== undefined && { basePrice: u.basePrice }),
            ...(u.duration  !== undefined && { duration:  u.duration  }),
            ...(u.isActive  !== undefined && { isActive:  u.isActive  }),
            ...(u.photos    !== undefined && { photos:    u.photos    }) }
        );
        updated++;
      } else {
        const existing = await Service.findOne({ salonId: salon._id, name: u.name });
        if (existing) {
          await Service.findByIdAndUpdate(existing._id, {
            ...(u.basePrice !== undefined && { basePrice: u.basePrice }),
            ...(u.duration  !== undefined && { duration:  u.duration  }),
            ...(u.isActive  !== undefined && { isActive:  u.isActive  }),
            ...(u.photos    !== undefined && { photos:    Array.isArray(u.photos) ? u.photos.slice(0,1) : [] }),
          });
          updated++;
        } else {
          const svc = await Service.create({
            name: u.name,
            description: '',
            salonId: salon._id,
            category: u.category || 'General',
            basePrice: u.basePrice || 0,
            duration: u.duration || 30,
            isActive: true,
            applicableFor: normalizeApplicableFor(u.applicableFor, salon.servedGender),
            photos: Array.isArray(u.photos) ? u.photos.slice(0,1) : [],
          });
          if (!salon.services.includes(svc._id)) salon.services.push(svc._id);
          created++;
        }
      }
    }
    await salon.save();
    res.json(formatSuccessResponse({ created, updated }, `${created + updated} services updated`));
  } catch (error) {
    console.error('Bulk upsert error:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// DELETE SERVICE
// ===================================================
exports.deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json(formatErrorResponse(messages.SERVICE.SERVICE_NOT_FOUND, 404));
    }

    const salon = await Business.findById(service.salonId);
    if (!salon || salon.ownerId.toString() !== req.owner._id.toString()) {
      return res.status(403).json(formatErrorResponse(messages.GENERIC.FORBIDDEN, 403));
    }

    await Business.findByIdAndUpdate(service.salonId, { $pull: { services: serviceId } });
    await Service.findByIdAndUpdate(serviceId, { deletedAt: new Date() });

    res.json(formatSuccessResponse(null, messages.SERVICE.SERVICE_DELETED));
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// BULK UPDATE SERVICES (price, duration, status, availability)
// ===================================================
exports.bulkUpdateServices = async (req, res) => {
  try {
    const { ids, patch } = req.body;

    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json(formatErrorResponse('ids must be a non-empty array', 400));
    if (!patch || typeof patch !== 'object' || Array.isArray(patch))
      return res.status(400).json(formatErrorResponse('patch is required', 400));
    if (!Object.keys(patch).length)
      return res.status(400).json(formatErrorResponse('patch must have at least one field', 400));

    const safeFields = ['basePrice', 'duration', 'isActive', 'applicableFor'];
    for (const k of Object.keys(patch)) {
      if (!safeFields.includes(k))
        return res.status(400).json(formatErrorResponse(`Field '${k}' not allowed in bulk update`, 400));
    }

    if (patch.basePrice !== undefined) {
      const p = Number(patch.basePrice);
      if (isNaN(p) || p < 0)
        return res.status(400).json(formatErrorResponse('basePrice must be a number ≥ 0', 400));
      patch.basePrice = p;
    }
    if (patch.duration !== undefined) {
      const d = Number(patch.duration);
      if (isNaN(d) || d < 1)
        return res.status(400).json(formatErrorResponse('duration must be a number ≥ 1', 400));
      patch.duration = d;
    }
    if (patch.isActive !== undefined && typeof patch.isActive !== 'boolean')
      return res.status(400).json(formatErrorResponse('isActive must be boolean', 400));
    if (patch.applicableFor !== undefined) {
      const validGenders = ['male', 'female'];
      if (!Array.isArray(patch.applicableFor) || !patch.applicableFor.length
          || patch.applicableFor.some(g => !validGenders.includes(g)))
        return res.status(400).json(formatErrorResponse('applicableFor must be a non-empty array of male/female', 400));
    }

    const salon = await Business.findOne({
      $or: [{ ownerId: req.owner._id }, { owner: req.owner._id }],
    });
    if (!salon) return res.status(404).json(formatErrorResponse('Salon not found', 404));

    const result = await Service.updateMany(
      { _id: { $in: ids }, salonId: salon._id, deletedAt: null },
      { $set: patch }
    );

    res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error('Error bulk updating services:', error);
    res.status(500).json(formatErrorResponse('Failed to update services', 500));
  }
};
