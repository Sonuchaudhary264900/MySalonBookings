// models/Salon.js
/*
  Salon Model
  Represents a salon/barbershop with:
  - Basic information (name, email, phone)
  - Location and address
  - Working hours and days
  - Media (photos, logo)
  - Ratings and reviews
  - Owner reference
  - Approval status
  - Business policies
*/

const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC INFORMATION
    // ==========================================
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
      minlength: [3, 'Salon name must be at least 3 characters'],
      maxlength: [100, 'Salon name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },

    // ==========================================
    // OWNER REFERENCE
    // ==========================================
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: true,
    },

   // ==========================================
// ADDRESS & LOCATION (Google Maps Integration)
// ==========================================

address: {
  type: String,
  required: [true, 'Address is required'],
  trim: true,
},

city: {
  type: String,
  required: [true, 'City is required'],
  trim: true,
},

state: {
  type: String,
  trim: true,
},

pincode: {
  type: String,
  trim: true,
},

// Latitude from Google Maps
latitude: {
  type: Number,
  required: true,
  min: -90,
  max: 90
},

// Longitude from Google Maps
longitude: {
  type: Number,
  required: true,
  min: -180,
  max: 180
},

// Google Maps Place ID
googlePlaceId: {
  type: String,
  default: null,
},

// GeoJSON location for MongoDB geospatial queries
location: {
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function(val) {
        return Array.isArray(val) && val.length === 2;
      },
      message: 'Coordinates must contain longitude and latitude'
    }
  },
},

    // ==========================================
    // CATEGORY
    // ==========================================
    category: {
      type: String,
      enum: ['barber', 'hair_salon', 'spa', 'massage', 'other'],
      default: 'barber',
    },

    // ==========================================
    // MEDIA
    // ==========================================
    photos: [
      {
        type: String, // Cloudinary URL
      },
    ],
    logo: {
      type: String, // Cloudinary URL
      default: null,
    },
    coverPhoto: {
      type: String, // Cloudinary URL
      default: null,
    },

    // ==========================================
    // WORKING HOURS
    // ==========================================
    workingHours: {
      monday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      tuesday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      wednesday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      thursday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      friday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      saturday: {
        open: { type: String, default: '09:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: false },
      },
      sunday: {
        open: { type: String, default: '10:00' },
        close: { type: String, default: '18:00' },
        isClosed: { type: Boolean, default: true },
      },
      holidays: [
        {
          date: Date,
          reason: String,
        },
      ],
    },

    // ==========================================
    // SERVICES & STAFF
    // ==========================================
    services: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    barbers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barber',
      },
    ],
    totalBarbers: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // STATUS & APPROVAL
    // ==========================================
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // ADMIN INFO
    // ==========================================
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    approvedDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    adminNotes: {
      type: String,
      default: null,
    },

    // ==========================================
    // RATINGS & REVIEWS
    // ==========================================
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    ratingBreakdown: {
      fiveStar: { type: Number, default: 0 },
      fourStar: { type: Number, default: 0 },
      threeStar: { type: Number, default: 0 },
      twoStar: { type: Number, default: 0 },
      oneStar: { type: Number, default: 0 },
    },

    // ==========================================
    // BUSINESS POLICIES
    // ==========================================
    cancellationPolicy: {
      type: String,
      default: '100% refund if cancelled 24+ hours before appointment',
    },
    refundPolicy: {
      type: String,
      default: 'Full refund for cancelled bookings',
    },
    termsAndConditions: {
      type: String,
      default: null,
    },

    // ==========================================
    // SOCIAL MEDIA
    // ==========================================
    instagramHandle: {
      type: String,
      trim: true,
      default: null,
    },
    facebookHandle: {
      type: String,
      trim: true,
      default: null,
    },
    youtubeChannel: {
      type: String,
      trim: true,
      default: null,
    },

    // ==========================================
    // BUSINESS STATS
    // ==========================================
    totalBookings: {
      type: Number,
      default: 0,
    },
    completedBookings: {
      type: Number,
      default: 0,
    },
    cancelledBookings: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    averageWaitTime: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // BOOKING WINDOW SETTINGS
    // ==========================================
    advanceBookingDays: {
      type: Number,
      default: 1,   // 0 = today only, 1 = today + tomorrow, N = today + N days
      min: 0,
      max: 30,
    },

    // ==========================================
    // SPECIAL FEATURES
    // ==========================================
    acceptsWalkIns: {
      type: Boolean,
      default: true,
    },
    hasParking: {
      type: Boolean,
      default: false,
    },
    acceptsOnlinePayment: {
      type: Boolean,
      default: true,
    },
    acceptsCash: {
      type: Boolean,
      default: true,
    },
    homeServiceAvailable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ===================================================
// INDEXES FOR PERFORMANCE
// ===================================================
salonSchema.index({ location: '2dsphere' });                              // geospatial nearby queries
salonSchema.index({ ownerId: 1 }, { unique: true });                     // one salon per owner lookup
salonSchema.index({ isApproved: 1, isActive: 1, averageRating: -1 });   // main public listing (approved + sorted)
salonSchema.index({ isApproved: 1, isActive: 1, city: 1 });             // city filter
salonSchema.index({ isApproved: 1, isActive: 1, category: 1 });         // category filter
salonSchema.index({ name: 'text', description: 'text', city: 'text' }); // full-text search

// ===================================================
// STATIC METHOD - FIND NEARBY SALONS
// ===================================================
salonSchema.statics.findNearby = function (latitude, longitude, maxDistance = 10000, filters = {}) {
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isApproved: true,
    isActive: true,
    ...filters,
  };

  return this.find(query);
};

// ===================================================
// STATIC METHOD - SEARCH SALONS
// ===================================================
salonSchema.statics.searchSalons = function (searchQuery, filters = {}) {
  const query = {
    $text: { $search: searchQuery },
    isApproved: true,
    isActive: true,
    ...filters,
  };

  return this.find(query, { score: { $meta: 'textScore' } }).sort({
    score: { $meta: 'textScore' },
  });
};

// ===================================================
// INSTANCE METHOD - IS OPEN NOW
// ===================================================
salonSchema.methods.isOpenNow = function () {
  const now = new Date();
  const day = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5);

  const dayHours = this.workingHours[day];
  if (!dayHours || dayHours.isClosed) return false;

  return currentTime >= dayHours.open && currentTime <= dayHours.close;
};

// ===================================================
// INSTANCE METHOD - GET NEXT AVAILABLE SLOT
// ===================================================
salonSchema.methods.getNextAvailableSlot = async function () {
  try {
    const now = new Date();
    const Queue = mongoose.model('Queue');

    const queue = await Queue.findOne({
      salonId: this._id,
      date: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      },
    });

    if (!queue || queue.queue.length === 0) {
      return now;
    }

    let totalTime = 0;

    queue.queue.forEach((booking) => {
      totalTime += booking.estimatedDuration || 30;
    });

    const nextSlot = new Date(now.getTime() + totalTime * 60000);

    return nextSlot;
  } catch (error) {
    console.error('Error getting next available slot:', error);
    return new Date();
  }
};

// ===================================================
// INSTANCE METHOD - UPDATE RATING
// ===================================================
salonSchema.methods.updateRating = async function () {
  try {
    const Review = mongoose.model('Review');
    const reviews = await Review.find({ salonId: this._id });

    if (reviews.length === 0) {
      this.averageRating = 0;
      this.totalReviews = 0;
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + (review.salonRating || 0), 0);

    this.averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    this.totalReviews = reviews.length;

    this.ratingBreakdown = {
      fiveStar: reviews.filter((r) => r.salonRating === 5).length,
      fourStar: reviews.filter((r) => r.salonRating === 4).length,
      threeStar: reviews.filter((r) => r.salonRating === 3).length,
      twoStar: reviews.filter((r) => r.salonRating === 2).length,
      oneStar: reviews.filter((r) => r.salonRating === 1).length,
    };

    await this.save();
  } catch (error) {
    console.error('Error updating salon rating:', error);
  }
};

// ===================================================
// VIRTUAL - IS OPEN
// ===================================================
salonSchema.virtual('openNow').get(function () {
  return this.isOpenNow();
});

module.exports = mongoose.model('Salon', salonSchema);