// models/Customer.js
/*
  Customer Model - End User / Customer
  Represents a customer who can:
  - Register with phone or email
  - Book appointments
  - Rate and review salons
  - Track bookings
  - Save favorite salons/barbers
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const customerSchema = new mongoose.Schema(
  {
    // ==========================================
    // AUTHENTICATION
    // ==========================================
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },

    // ==========================================
    // PERSONAL INFO
    // ==========================================
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', null],
      default: null,
    },
    profilePhoto: {
      type: String, // Cloudinary URL
      default: null,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: null,
    },

    // ==========================================
    // STATUS
    // ==========================================
    role: {
      type: String,
      enum: ['customer'],
      default: 'customer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
      select: false,
    },
    banReason: {
      type: String,
      select: false,
    },
    bannedAt: {
      type: Date,
      select: false,
    },

    // ==========================================
    // LOCATION
    // ==========================================
    savedLocations: [
      {
        name: {
          type: String, // "Home", "Office"
          trim: true,
        },
        address: {
          type: String,
          required: true,
          trim: true,
        },
        city: {
          type: String,
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
        coordinates: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0],
          },
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================
    // LAST KNOWN LOCATION (updated when app registers push token)
    // ==========================================
    lastLocation: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
    lastLocationAt: { type: Date },

    // ==========================================
    // PREFERENCES
    // ==========================================
    preferredGender: {
      type: String,
      enum: ['male', 'female', 'any'],
      default: 'any',
    },
    preferredSalons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
      },
    ],
    preferredBarbers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barber',
      },
    ],
    followedSalons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
      },
    ],

    // ==========================================
    // NOTIFICATION PREFERENCES
    // ==========================================
    notificationPreferences: {
      sms: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        enum: ['en', 'hi'],
        default: 'en',
      },
    },

    // ==========================================
    // STATS & HISTORY
    // ==========================================
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalSpent: {
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
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    lastBookingDate: {
      type: Date,
      default: null,
    },

    pushToken: {
      type: String,
      default: null,
    },

    // ==========================================
    // AUTHENTICATION TOKENS
    // ==========================================
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 7 * 24 * 60 * 60, // Auto delete after 7 days
        },
      },
    ],

    // ==========================================
    // TIMESTAMPS
    // ==========================================
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
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
customerSchema.index({ phone: 1, sparse: true });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ totalBookings: -1 });
customerSchema.index({ 'savedLocations.coordinates': '2dsphere' }, { sparse: true });
customerSchema.index({ lastLocation: '2dsphere' }, { sparse: true });

// ===================================================
// MIDDLEWARE - HASH PASSWORD BEFORE SAVE
// ===================================================
customerSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ===================================================
// METHOD - COMPARE PASSWORD
// ===================================================
customerSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// ===================================================
// METHOD - GET PUBLIC PROFILE
// ===================================================
customerSchema.methods.getPublicProfile = function () {
  const customer = this.toObject();
  delete customer.password;
  delete customer.isBanned;
  delete customer.banReason;
  delete customer.bannedAt;
  return customer;
};

// ===================================================
// METHOD - SAVE FAVORITE SALON
// ===================================================
customerSchema.methods.saveFavoriteSalon = async function (salonId) {
  try {
    if (!this.preferredSalons.includes(salonId)) {
      this.preferredSalons.push(salonId);
      await this.save();
    }
    return this.preferredSalons;
  } catch (error) {
    throw error;
  }
};

// ===================================================
// METHOD - REMOVE FAVORITE SALON
// ===================================================
customerSchema.methods.removeFavoriteSalon = async function (salonId) {
  try {
    this.preferredSalons = this.preferredSalons.filter(
      (id) => id.toString() !== salonId.toString()
    );
    await this.save();
    return this.preferredSalons;
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('Customer', customerSchema);
