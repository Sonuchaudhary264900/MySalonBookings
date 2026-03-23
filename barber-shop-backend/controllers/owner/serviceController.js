// controllers/owner/serviceController.js
/*
  Service Controller
  Handles:
  - Create service
  - Update service
  - Delete service
  - Get salon's services
  - Update service variants
*/

const Service = require('../../models/Service');
const Salon = require('../../models/Salon');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateServiceData } = require('../../utils/validators');
const messages = require('../../utils/messages');

// ===================================================
// CREATE SERVICE
// ===================================================
exports.createService = async (req, res) => {
  try {
    const { name, description, category, basePrice, duration, variants, applicableFor } = req.body;

    // Validate input
    const validation = validateServiceData({ name, basePrice, duration });
    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    // Get owner's salon
    const salon = await Salon.findOne({ ownerId: req.owner._id });
    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    // Create service
    const service = await Service.create({
      name,
      description: description || '',
      salonId: salon._id,
      category: category || 'haircut',
      basePrice,
      duration,
      variants: variants || [],
      applicableFor: applicableFor || ['male'],
      isActive: true,
    });

    // Add service to salon
    if (!salon.services.includes(service._id)) {
      salon.services.push(service._id);
    }
    await salon.save();

    res.status(201).json(
      formatSuccessResponse(service, messages.SERVICE.SERVICE_CREATED, 201)
    );
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// GET SALON'S SERVICES
// ===================================================
exports.getSalonServices = async (req, res) => {
  try {
    const salon = await Salon.findOne({ ownerId: req.owner._id });
    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    const services = await Service.find({ salonId: salon._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      formatSuccessResponse(
        { services, total: services.length },
        messages.GENERIC.RETRIEVED
      )
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
    const { name, description, basePrice, duration, variants, isActive } = req.body;

    // Find service
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json(
        formatErrorResponse(messages.SERVICE.SERVICE_NOT_FOUND, 404)
      );
    }

    // Verify ownership
    const salon = await Salon.findById(service.salonId);
    if (!salon || salon.ownerId.toString() !== req.owner._id.toString()) {
      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN, 403)
      );
    }

    // Update fields
    if (name) service.name = name;
    if (description !== undefined) service.description = description;
    if (basePrice !== undefined) service.basePrice = basePrice;
    if (duration !== undefined) service.duration = duration;
    if (variants) service.variants = variants;
    if (isActive !== undefined) service.isActive = isActive;

    await service.save();

    res.json(
      formatSuccessResponse(service, messages.SERVICE.SERVICE_UPDATED)
    );
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
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
      return res.status(404).json(
        formatErrorResponse(messages.SERVICE.SERVICE_NOT_FOUND, 404)
      );
    }

    // Verify ownership
    const salon = await Salon.findById(service.salonId);
    if (!salon || salon.ownerId.toString() !== req.owner._id.toString()) {
      return res.status(403).json(
        formatErrorResponse(messages.GENERIC.FORBIDDEN, 403)
      );
    }

    // Remove from salon
    await Salon.findByIdAndUpdate(service.salonId, {
      $pull: { services: serviceId },
    });

    // Delete service
    await Service.findByIdAndDelete(serviceId);

    res.json(
      formatSuccessResponse(null, messages.SERVICE.SERVICE_DELETED)
    );
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};
