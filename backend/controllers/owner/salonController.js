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

const Business = require('../../models/Business');
const Owner = require('../../models/Owner');
const Service = require('../../models/Service');
const Barber = require('../../models/Barber');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateSalonData, validateCoordinates } = require('../../utils/validators');
const { getCoordinatesFromAddress } = require("../../services/googleMapsService");
const messages = require('../../utils/messages');
const { cloudinary } = require('../../config/cloudinary');
const https = require('https');

// Reverse geocode coordinates → locality (suburb/village/neighbourhood)
async function reverseGeocodeLocality(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    https.get(url, { headers: { 'User-Agent': 'MySalonBookings/1.0', 'Accept-Language': 'en' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const a = JSON.parse(data).address || {};
          const place = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.quarter || a.county || null;
          resolve(place);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}


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
      name, phone, email, address, city, district, state, pincode,
      workingHours, description, photos, videoPublicId,
      businessType, servedGender, offeredCategories, kidsHaircut, atHomeServices,
      location: bodyLocation,
      videoUrl, businessLicenseUrl, businessRegistrationUrl,
    } = req.body;

    const validation = validateSalonData({
      name,
      phone,
      email,
      address,
      city,
      servedGender,
    });

    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    // Derive category from businessType for backward-compat fields
    const BUSINESS_TYPE_TO_CATEGORY = {
      barbershop:    'barber',
      salon:         'hair_salon',
      spa_wellness:  'spa',
      makeup_bridal: 'other',
      skin_derma:    'other',
    };
    const resolvedBusinessType = businessType || 'salon';
    const resolvedCategory     = BUSINESS_TYPE_TO_CATEGORY[resolvedBusinessType] || 'hair_salon';

    let latitude;
    let longitude;
    let googlePlaceId;

    // 1. Use coordinates sent by the frontend (from map pin)
    if (bodyLocation && bodyLocation.latitude && bodyLocation.longitude) {
      latitude  = Number(bodyLocation.latitude);
      longitude = Number(bodyLocation.longitude);
    } else {
      // 2. Geocode from address via Google Maps
      try {
        const locationData = await getCoordinatesFromAddress(address);
        latitude      = locationData.latitude;
        longitude     = locationData.longitude;
        googlePlaceId = locationData.placeId;
      } catch (error) {
        console.error('[createSalon] Google Maps geocode failed:', error.message);
        latitude  = 0;
        longitude = 0;
      }
    }

    const existingSalon = await Business.findOne({ ownerId: req.owner._id });
    if (existingSalon) {
      return res.status(409).json(
        formatErrorResponse('You already have a salon registered', 409)
      );
    }

    const phoneInUse = await Business.findOne({ phone: phone.trim() });
    if (phoneInUse) {
      return res.status(409).json(
        formatErrorResponse('This phone number is already registered to another salon. Please use a different number.', 409)
      );
    }

    // Normalize photos: accept both plain URL strings and full objects with publicId/isCover
    const normalizedPhotos = Array.isArray(photos)
      ? photos
          .map((p) => {
            if (typeof p === 'string') return { url: p, publicId: '', caption: '', tags: [], isCover: false };
            return {
              url:      p.url || p.imageUrl || '',
              publicId: p.publicId || '',
              caption:  p.caption  || '',
              tags:     Array.isArray(p.tags) ? p.tags : [],
              isCover:  Boolean(p.isCover),
            };
          })
          .filter((p) => p.url)
      : [];

    // Pick the cover photo — prefer explicitly flagged isCover, else first photo
    const coverPhoto = normalizedPhotos.find(p => p.isCover)?.url
      || normalizedPhotos[0]?.url
      || null;

    const targetGender = servedGender === 'male' ? 'male' : servedGender === 'female' ? 'female' : 'both';

    const salon = await Business.create({
      name,
      phone,
      email,
      address,
      city:     city     || district || '',
      district: district || '',
      state:    state    || '',
      pincode:  pincode  || '',

      latitude,
      longitude,
      googlePlaceId: googlePlaceId || '',
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      },
      locality: await reverseGeocodeLocality(Number(latitude), Number(longitude)),

      description:   description || '',
      category:      resolvedCategory,
      businessType:  resolvedBusinessType,
      servedGender:  servedGender || 'unisex',

      offeredCategories: Array.isArray(offeredCategories) ? offeredCategories : [],
      kidsHaircut:       Boolean(kidsHaircut),
      atHomeServices:    Boolean(atHomeServices),
      homeServiceAvailable: Boolean(atHomeServices),

      photos:     normalizedPhotos,
      coverPhoto,

      workingHours: workingHours || {
        monday:    { open: '09:00', close: '18:00', isClosed: false },
        tuesday:   { open: '09:00', close: '18:00', isClosed: false },
        wednesday: { open: '09:00', close: '18:00', isClosed: false },
        thursday:  { open: '09:00', close: '18:00', isClosed: false },
        friday:    { open: '09:00', close: '18:00', isClosed: false },
        saturday:  { open: '09:00', close: '18:00', isClosed: false },
        sunday:    { open: '10:00', close: '18:00', isClosed: true  },
      },

      ...(videoUrl ? {
        videoUrl,
        videoPublicId: videoPublicId || '',
        videos:     [{ url: videoUrl, caption: '', tags: [] }],
        reelVideos: [{ url: videoUrl, categories: [], targetGender, createdAt: new Date() }],
      } : {}),
      ...(businessLicenseUrl        ? { businessLicenseUrl }        : {}),
      ...(businessRegistrationUrl   ? { businessRegistrationUrl }   : {}),

      ownerId:        req.owner._id,
      approvalStatus: 'approved',
      isApproved:     true,
      approvedDate:   new Date(),
    });

    // Pull owner's current gender from DB (set during account creation)
    const ownerRecord = await Owner.findById(req.owner._id).select('gender');

    const BIZ_TYPE_TO_OWNER_TYPE = {
      barbershop:    'BARBERSHOP_OWNER',
      salon:         'SALON_OWNER',
      spa_wellness:  'SPA_WELLNESS_OWNER',
      makeup_bridal: 'MAKEUP_BRIDAL_OWNER',
      skin_derma:    'SKIN_DERMA_OWNER',
    };

    await Owner.findByIdAndUpdate(
      req.owner._id,
      {
        businessId:   salon._id,
        ownerType:    BIZ_TYPE_TO_OWNER_TYPE[resolvedBusinessType] || 'SALON_OWNER',
        status:       'approved',
        address: address || '',
        city:    city || district || '',
        state:   state || '',
        pincode: pincode || '',
        'subscription.trialStartDate': new Date(),
        'subscription.planType':       'free_trial',
        'subscription.paymentStatus':  'trial',
      }
    );

    // Auto-create the owner's virtual barber record so every booking always has an assignee
    await Barber.create({
      name:        ownerRecord?.name || (await Owner.findById(req.owner._id).select('name')).name || 'Owner',
      salonId:     salon._id,
      ownerId:     req.owner._id,
      isOwner:     true,
      staffRole:   'owner',
      loginEnabled: false,
      isActive:    true,
      workingDays: ['monday','tuesday','wednesday','thursday','friday','saturday'],
    });

    res.status(201).json(
      formatSuccessResponse(
        salon,
        messages.SALON.SALON_CREATED,
        201
      )
    );

  } catch (error) {

    console.error('Error creating salon:', error);

    // Mongoose validation errors — surface them as 400 so the frontend can show useful messages
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map(e => e.message);
      return res.status(400).json(
        formatErrorResponse('Validation failed', 400, msgs)
      );
    }

    // MongoDB duplicate key (unique index violation that slipped past our pre-checks)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json(
        formatErrorResponse(`This ${field} is already registered. Please use a different value.`, 409)
      );
    }

    res.status(500).json(
      formatErrorResponse(error.message || messages.GENERIC.ERROR, 500)
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

    const salon = await Business.findOne({ ownerId: req.owner._id })
      .populate('services')
      .populate('barbers')
      .lean();

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    // Log raw DB values so we can see what's actually stored (check Render logs)
    console.log(`[getMySalon] salonId=${salon._id} salonType=${salon.salonType} businessType=${salon.businessType}`);

    // salonType = old field name (explicit user selection, reliable)
    // businessType = new field name (may have been incorrectly defaulted to 'salon')
    // If salonType exists it overrides businessType (it was explicitly set by user)
    if (salon.salonType) {
      const correct = salon.salonType;
      salon.businessType = correct;
      // Permanently fix DB: write correct value and remove old field
      Business.updateOne({ _id: salon._id }, { $set: { businessType: correct }, $unset: { salonType: 1 } })
        .then(() => console.log(`[getMySalon] Migrated salonType → businessType: ${correct}`))
        .catch(e => console.error('[getMySalon] Migration failed:', e.message));
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
      businessType, servedGender, offeredCategories, kidsHaircut, atHomeServices, categoryImages,
      categoryGenders,
    } = req.body;

    const salon = await Business.findOne({ ownerId: req.owner._id });

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    if (name) salon.name = name;
    if (phone && phone.trim() !== salon.phone) {
      const phoneInUse = await Business.findOne({ phone: phone.trim(), _id: { $ne: salon._id } });
      if (phoneInUse) {
        return res.status(409).json(
          formatErrorResponse('This phone number is already registered to another salon.', 409)
        );
      }
      salon.phone = phone.trim();
    }
    if (email) salon.email = email;
    if (address) salon.address = address;
    if (city) salon.city = city;
    if (state) salon.state = state;
    if (pincode) salon.pincode = pincode;
    if (description) salon.description = description;
    if (businessType) {
      salon.businessType = businessType;
      const BIZ_TYPE_TO_OWNER_TYPE = {
        barbershop: 'BARBERSHOP_OWNER', salon: 'SALON_OWNER',
        spa_wellness: 'SPA_WELLNESS_OWNER', makeup_bridal: 'MAKEUP_BRIDAL_OWNER',
        skin_derma: 'SKIN_DERMA_OWNER',
      };
      await Owner.findByIdAndUpdate(req.owner._id, { ownerType: BIZ_TYPE_TO_OWNER_TYPE[businessType] || 'SALON_OWNER' });
    }
    if (servedGender) salon.servedGender = servedGender;
    if (Array.isArray(offeredCategories)) {
      salon.offeredCategories = offeredCategories;
      salon.markModified('offeredCategories');
    }
    if (kidsHaircut !== undefined) salon.kidsHaircut = kidsHaircut;
    if (atHomeServices !== undefined) salon.atHomeServices = atHomeServices;
    if (categoryImages && typeof categoryImages === 'object') {
      salon.categoryImages = categoryImages;
      salon.markModified('categoryImages');
    }
    if (categoryGenders && typeof categoryGenders === 'object') {
      salon.categoryGenders = categoryGenders;
      salon.markModified('categoryGenders');
    }

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
      salon.locality = await reverseGeocodeLocality(lat, lng);
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

    if (req.body.sectionImages && typeof req.body.sectionImages === 'object') {
      for (const [key, val] of Object.entries(req.body.sectionImages)) {
        salon.sectionImages.set(key, val);
      }
      salon.markModified('sectionImages');
    }

    await salon.save();

    // Sync offeredCategories sub-services → Service collection
    // so they appear in the user-facing /public/salons/:id/services endpoint
    if (Array.isArray(offeredCategories)) {
      const effectiveGender = servedGender || salon.servedGender;
      const applicableFor =
        effectiveGender === 'male'   ? ['male'] :
        effectiveGender === 'female' ? ['female'] :
        ['male', 'female'];

      const upsertedIds = [];

      for (const cat of offeredCategories) {
        const categoryName = cat.name || '';
        for (const sub of (cat.subServices || [])) {
          const basePrice = parseFloat(sub.price) || 0;
          const duration  = parseInt(sub.duration) || 0;
          if (!sub.name || basePrice <= 0 || duration <= 0) continue;

          // Use per-sub applicableFor if set (gender-split unisex categories),
          // otherwise fall back to salon-level applicableFor
          const serviceApplicableFor = Array.isArray(sub.applicableFor) && sub.applicableFor.length > 0
            ? sub.applicableFor
            : applicableFor;

          const serviceUpdate = { category: categoryName, basePrice, duration, isActive: true, applicableFor: serviceApplicableFor };
          if (sub.photo) serviceUpdate['photos'] = [sub.photo];
          const upserted = await Service.findOneAndUpdate(
            { salonId: salon._id, name: sub.name, applicableFor: serviceApplicableFor },
            { $set: serviceUpdate },
            { upsert: true, new: true }
          );
          upsertedIds.push(upserted._id);
        }
      }

      // Service Menu is source of truth — deactivate ALL services not in the new menu
      // This clears out old manually-created services that no longer belong
      await Service.updateMany(
        { salonId: salon._id, _id: { $nin: upsertedIds } },
        { $set: { isActive: false } }
      );

      // Ensure all synced services are referenced in salon.services[]
      if (upsertedIds.length > 0) {
        await Business.findByIdAndUpdate(salon._id, {
          $addToSet: { services: { $each: upsertedIds } },
        });
      }
    }

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

    const salon = await Business.findOne({ ownerId: req.owner._id });

    if (!salon) {
      return res.status(404).json(
        formatErrorResponse(messages.SALON.SALON_NOT_FOUND, 404)
      );
    }

    if (photos && Array.isArray(photos)) {
      const MAX_SALON_PHOTOS = 500;
      const urlOf = (p) => {
        if (p == null) return '';
        if (typeof p === 'string') return p.trim();
        if (typeof p === 'object') return String(p.url || p.imageUrl || '').trim();
        return '';
      };
      const normalizeIncomingPhotos = (arr) =>
        arr
          .slice(0, MAX_SALON_PHOTOS)
          .map((p) => {
            if (typeof p === 'string') {
              const url = p.trim();
              if (!/^https?:\/\//i.test(url)) return null;
              return { url, caption: '', tags: [], isCover: false };
            }
            if (p && typeof p === 'object') {
              const url = String(p.url || p.imageUrl || '').trim();
              if (!/^https?:\/\//i.test(url)) return null;
              return {
                url,
                caption: p.caption || '',
                tags: Array.isArray(p.tags) ? p.tags : [],
                isCover: Boolean(p.isCover),
              };
            }
            return null;
          })
          .filter(Boolean);

      const nextList = normalizeIncomingPhotos(photos);
      const oldUrls = (salon.photos || []).map(urlOf).filter(Boolean);
      const newUrlSet = new Set(nextList.map((e) => e.url));
      const removedUrls = oldUrls.filter((u) => !newUrlSet.has(u));
      if (removedUrls.length > 0) {
        await Promise.allSettled(
          removedUrls.map((url) => {
            try {
              const parts = url.split('/');
              const fileWithExt = parts[parts.length - 1];
              const folder = parts[parts.length - 2];
              const publicId = `${folder}/${fileWithExt.split('.')[0]}`;
              return cloudinary.uploader.destroy(publicId);
            } catch {
              return Promise.resolve();
            }
          })
        );
      }
      salon.photos = nextList;
    }

    if (logo) salon.logo = logo;

    if (coverPhoto) salon.coverPhoto = coverPhoto;

    await salon.save({ validateModifiedOnly: true });

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

    const salon = await Business.findOne({ ownerId: req.owner._id }).select(
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


