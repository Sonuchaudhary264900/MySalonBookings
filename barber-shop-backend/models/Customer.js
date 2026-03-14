// models/Customer.js
/*
  Customer Model - End User / Customer
  Represents a customer who can:
  - Register with phone or email
  - Book appointments
  - Rate and review salons
  - Track bookings
  - Save favorite salons/barbers
  - Manage wallet and loyalty points
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
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    emailVerified: {
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
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required'],
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
        ref: 'Salon',
      },
    ],
    preferredBarbers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Barber',
      },
    ],

    // ==========================================
    // WALLET & LOYALTY
    // ==========================================
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    membershipTier: {
      type: String,
      enum: ['bronze', 'silver', 'gold'],
      default: 'bronze',
    },
    membershipStartDate: {
      type: Date,
      default: null,
    },
    membershipExpiryDate: {
      type: Date,
      default: null,
    },

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

    // ==========================================
    // REFERRAL PROGRAM
    // ==========================================
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    referralCount: {
      type: Number,
      default: 0,
    },
    referralBonusUsed: {
      type: Boolean,
      default: false,
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
customerSchema.index({ email: 1 });
customerSchema.index({ referralCode: 1, sparse: true });
customerSchema.index({ createdAt: -1 });
customerSchema.index({ totalBookings: -1 });
customerSchema.index({ 'savedLocations.coordinates': '2dsphere' });

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
// MIDDLEWARE - GENERATE REFERRAL CODE
// ===================================================
customerSchema.pre('save', async function (next) {
  if (!this.referralCode) {
    // Generate unique referral code
    this.referralCode = `REF_${this._id.toString().slice(-8).toUpperCase()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  }
  next();
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
// METHOD - ADD WALLET BALANCE
// ===================================================
customerSchema.methods.addWalletBalance = async function (amount) {
  try {
    if (amount <= 0) throw new Error('Amount must be positive');
    this.walletBalance += amount;
    await this.save();
    return this.walletBalance;
  } catch (error) {
    throw error;
  }
};

// ===================================================
// METHOD - DEDUCT WALLET BALANCE
// ===================================================
customerSchema.methods.deductWalletBalance = async function (amount) {
  try {
    if (amount <= 0) throw new Error('Amount must be positive');
    if (this.walletBalance < amount) throw new Error('Insufficient wallet balance');
    this.walletBalance -= amount;
    await this.save();
    return this.walletBalance;
  } catch (error) {
    throw error;
  }
};

// ===================================================
// METHOD - ADD LOYALTY POINTS
// ===================================================
customerSchema.methods.addLoyaltyPoints = async function (points) {
  try {
    if (points <= 0) throw new Error('Points must be positive');
    this.loyaltyPoints += points;
    
    // Update membership tier based on points
    if (this.loyaltyPoints >= 5000) {
      this.membershipTier = 'gold';
    } else if (this.loyaltyPoints >= 2000) {
      this.membershipTier = 'silver';
    } else {
      this.membershipTier = 'bronze';
    }
    
    await this.save();
    return this.loyaltyPoints;
  } catch (error) {
    throw error;
  }
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

// ===================================================
// VIRTUAL - IS PREMIUM MEMBER
// ===================================================
customerSchema.virtual('isPremiumMember').get(function () {
  return this.membershipTier === 'gold' || this.membershipTier === 'silver';
});

module.exports = mongoose.model('Customer', customerSchema);
