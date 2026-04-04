// controllers/owner/serviceController.js
const Service = require('../../models/Service');
const Salon = require('../../models/Salon');
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
    const { name, description, category, basePrice, duration, variants, applicableFor } = req.body;

    const validation = validateServiceData({ name, basePrice, duration });
    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    const salon = await Salon.findOne({ ownerId: req.owner._id });
    if (!salon) {
      return res.status(404).json(formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404));
    }

    const normalizedApplicableFor = normalizeApplicableFor(applicableFor, salon.servedGender);

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
    const salon = await Salon.findOne({ ownerId: req.owner._id });
    if (!salon) {
      return res.status(404).json(formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404));
    }

    const services = await Service.find({ salonId: salon._id })
      .sort({ isActive: -1, createdAt: -1 })
      .lean();

    res.json(
      formatSuccessResponse({ services, total: services.length }, messages.GENERIC.RETRIEVED)
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
    const { name, description, category, basePrice, duration, variants, isActive, applicableFor } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json(formatErrorResponse(messages.SERVICE.SERVICE_NOT_FOUND, 404));
    }

    const salon = await Salon.findById(service.salonId);
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

    await service.save();

    res.json(formatSuccessResponse(service, messages.SERVICE.SERVICE_UPDATED));
  } catch (error) {
    console.error('Error updating service:', error);
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

    const salon = await Salon.findById(service.salonId);
    if (!salon || salon.ownerId.toString() !== req.owner._id.toString()) {
      return res.status(403).json(formatErrorResponse(messages.GENERIC.FORBIDDEN, 403));
    }

    await Salon.findByIdAndUpdate(service.salonId, { $pull: { services: serviceId } });
    await Service.findByIdAndDelete(serviceId);

    res.json(formatSuccessResponse(null, messages.SERVICE.SERVICE_DELETED));
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};
