// controllers/owner/salonController.js
/*
  Owner Salon Controller
  Handles:
  - Create new salon
  - Get owner's salon
  - Update salon details
  - Get salon approval status
  - Search nearby salons (customer-side)
  - Get salon by ID with services
*/

const Salon = require('../../models/Salon');
const Owner = require('../../models/Owner');
const Service = require('../../models/Service');
const Barber = require('../../models/Barber');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateSalonData, validateCoordinates } = require('../../utils/validators');
const { getCoordinatesFromAddress } = require("../../services/googleMapsService");
const messages = require('../../utils/messages');
const { cloudinary } = require('../../config/cloudinary');


// ===================================================
// CREATE SALON
// ===================================================
exports.createSalon = async (req, res) => {
  try {

    if (!req.owner || !req.owner._id) {
      return res.status(401).json(
        formatErrorResponse("Unauthorized owner",401)
      );
    }

    const {
      name, phone, email, address, city, state, pincode,
      workingHours, description, photos, category,
      servedGender, offeredCategories, kidsHaircut, atHomeServices,
      location: bodyLocation,
    } = req.body;

    const validation = validateSalonData({
      name,
      phone,
      email,
      address,
      city,
    });

    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    let latitude;
    let longitude;
    let googlePlaceId;

    // 1. Use coordinates sent by the frontend (from map pin in step 2)
    if (bodyLocation && bodyLocation.latitude && bodyLocation.longitude) {
      latitude  = Number(bodyLocation.latitude);
      longitude = Number(bodyLocation.longitude);
    } else {
      // 2. Geocode from address via Google Maps
      try {
        const locationData = await getCoordinatesFromAddress(address);
        latitude     = locationData.latitude;
        longitude    = locationData.longitude;
        googlePlaceId = locationData.placeId;
      } catch (error) {
        console.error("Google Maps Error:", error.message);
        // 3. Fallback — save salon without precise coords (owner can update later)
        latitude  = 0;
        longitude = 0;
      }
    }

    const existingSalon = await Salon.findOne({ ownerId: req.owner._id });

    if (existingSalon) {
      return res.status(409).json(
        formatErrorResponse('You already have a salon registered', 409)
      );
    }

    const salon = await Salon.create({

      name,
      phone,
      email,
      address,
      city,
      state: state || '',
      pincode: pincode || '',

      latitude,
      longitude,
      googlePlaceId: googlePlaceId || '',

      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },

      description: description || '',
      category: category || 'barber',
      servedGender: servedGender || 'unisex',
      offeredCategories: Array.isArray(offeredCategories) ? offeredCategories : [],
      kidsHaircut: kidsHaircut || false,
      atHomeServices: atHomeServices || false,
      photos: Array.isArray(photos) ? photos : [],
      coverPhoto: Array.isArray(photos) && photos.length > 0 ? photos[0] : null,

      workingHours: workingHours || {
        monday: { open: '09:00', close: '18:00', isClosed: false },
        tuesday: { open: '09:00', close: '18:00', isClosed: false },
        wednesday: { open: '09:00', close: '18:00', isClosed: false },
        thursday: { open: '09:00', close: '18:00', isClosed: false },
        friday: { open: '09:00', close: '18:00', isClosed: false },
        saturday: { open: '09:00', close: '18:00', isClosed: false },
        sunday: { open: '10:00', close: '18:00', isClosed: true },
      },

      ownerId: req.owner._id,
      approvalStatus: 'pending',
      isApproved: false,
    });

    await Owner.findByIdAndUpdate(
      req.owner._id,
      {
        salonId: salon._id,
        status: 'salon_registered',
        businessName: salon.name,
      }
    );

    res.status(201).json(
      formatSuccessResponse(
        salon,
        messages.SALON.SALON_CREATED,
        201
      )
    );

  } catch (error) {

    console.error('Error creating salon:', error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );

  }
};


// ===================================================
// GET OWNER'S SALON
// ===================================================
exports.getMySalon = async (req, res) => {

  try {

    if (!req.owner || !req.owner._id) {
      return res.status(401).json(
        formatErrorResponse("Unauthorized owner",401)
      );
    }

    const salon = await Salon.findOne({ ownerId: req.owner._id })
      .populate('services')
      .populate('barbers')
      .lean();

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    res.json(
      formatSuccessResponse(salon, messages.GENERIC.RETRIEVED)
    );

  } catch (error) {

    console.error('Error fetching salon:', error);

    res.status(500).json(
      formatErrorResponse(`${messages.GENERIC.ERROR} [DEBUG: ${error.name}: ${error.message}]`, 500)
    );

  }

};


// ===================================================
// UPDATE SALON DETAILS
// ===================================================
exports.updateSalon = async (req, res) => {

  try {

    const {
      name, phone, email, address, city, state, pincode,
      location, workingHours, description,
      servedGender, offeredCategories, kidsHaircut, atHomeServices,
    } = req.body;

    const salon = await Salon.findOne({ ownerId: req.owner._id });

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    if (name) salon.name = name;
    if (phone) salon.phone = phone;
    if (email) salon.email = email;
    if (address) salon.address = address;
    if (city) salon.city = city;
    if (state) salon.state = state;
    if (pincode) salon.pincode = pincode;
    if (description) salon.description = description;
    if (servedGender) salon.servedGender = servedGender;
    if (Array.isArray(offeredCategories)) salon.offeredCategories = offeredCategories;
    if (kidsHaircut !== undefined) salon.kidsHaircut = kidsHaircut;
    if (atHomeServices !== undefined) salon.atHomeServices = atHomeServices;

    if (location && location.latitude && location.longitude) {

      const lat = Number(location.latitude);
      const lng = Number(location.longitude);

      const isValid = validateCoordinates(lat, lng);

      if (!isValid) {
        return res.status(400).json(
          formatErrorResponse('Invalid coordinates', 400)
        );
      }

      salon.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      salon.latitude = lat;
      salon.longitude = lng;
    }

    if (workingHours) {

      salon.workingHours = {
        ...salon.workingHours,
        ...workingHours,
      };

    }

    if (req.body.advanceBookingDays !== undefined) {
      const days = Number(req.body.advanceBookingDays);
      if (!isNaN(days) && days >= 0 && days <= 30) {
        salon.advanceBookingDays = days;
      }
    }

    if (req.body.bookingMode !== undefined) {
      if (['sequential', 'flexible'].includes(req.body.bookingMode)) {
        salon.bookingMode = req.body.bookingMode;
      }
    }

    if (req.body.autoConfirmBookings !== undefined) {
      salon.autoConfirmBookings = Boolean(req.body.autoConfirmBookings);
    }

    await salon.save();

    res.json(
      formatSuccessResponse(salon, messages.SALON.SALON_UPDATED)
    );

  } catch (error) {

    console.error('Error updating salon:', error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );

  }

};


// ===================================================
// UPLOAD SALON PHOTOS TO CLOUDINARY
// ===================================================
exports.uploadSalonPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(formatErrorResponse('No files uploaded', 400));
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'smart-salon/salon-photos', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        stream.end(file.buffer);
      });
    });

    const urls = await Promise.all(uploadPromises);
    res.json(formatSuccessResponse({ urls }, 'Photos uploaded successfully'));
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json(formatErrorResponse('Failed to upload photos', 500));
  }
};


// ===================================================
// UPDATE SALON PHOTOS
// ===================================================
exports.updateSalonPhotos = async (req, res) => {

  try {

    const { photos, logo, coverPhoto } = req.body;

    const salon = await Salon.findOne({ ownerId: req.owner._id });

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    if (photos && Array.isArray(photos)) {
      // Find photos that were removed and delete them from Cloudinary
      const removedPhotos = (salon.photos || []).filter(url => !photos.includes(url));
      if (removedPhotos.length > 0) {
        await Promise.allSettled(
          removedPhotos.map(url => {
            // Extract public_id from Cloudinary URL
            const parts = url.split('/');
            const fileWithExt = parts[parts.length - 1];
            const folder = parts[parts.length - 2];
            const publicId = `${folder}/${fileWithExt.split('.')[0]}`;
            return cloudinary.uploader.destroy(publicId);
          })
        );
      }
      salon.photos = photos.slice(0, 10);
    }

    if (logo) salon.logo = logo;

    if (coverPhoto) salon.coverPhoto = coverPhoto;

    await salon.save();

    res.json(
      formatSuccessResponse(salon, 'Photos updated successfully')
    );

  } catch (error) {

    console.error('Error updating photos:', error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );

  }

};


// ===================================================
// GET SALON APPROVAL STATUS
// ===================================================
exports.getApprovalStatus = async (req, res) => {

  try {

    const salon = await Salon.findOne({ ownerId: req.owner._id }).select(
      'approvalStatus isApproved rejectionReason approvedDate'
    );

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    res.json(
      formatSuccessResponse(
        {
          isApproved: salon.isApproved,
          approvalStatus: salon.approvalStatus,
          rejectionReason: salon.rejectionReason,
          approvedDate: salon.approvedDate,
        },
        messages.GENERIC.RETRIEVED
      )
    );

  } catch (error) {

    console.error('Error fetching approval status:', error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );

  }

};


