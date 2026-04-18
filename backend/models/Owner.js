// models/Owner.js
/*
  Owner Model - Salon Owner
  Represents a salon owner who can manage their salon,
  services, barbers, and bookings
  
  Fields track:
  - Authentication (phone, password, tokens)
  - Personal info (name, email)
  - Salon reference
  - Approval status
  - Business details
  - Subscription plan
  - Stats (bookings, revenue)
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ownerSchema = new mongoose.Schema(
  {
    // ==========================================
    // AUTHENTICATION
    // ==========================================
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+\d{1,15}$/, 'Please provide a valid phone number with country code'],
    },
    firebaseUid: {
      type: String,
      default: null,
      sparse: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    emailVerified: {
      type: Boolean,
      default: false,
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
      enum: ['male', 'female', 'other', null],
      default: null,
    },
    profilePhoto: {
      type: String, // Cloudinary URL
      default: null,
    },

    // ==========================================
    // BUSINESS REFERENCE
    // ==========================================
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
    },
    ownerType: {
      type: String,
      enum: ['BARBERSHOP_OWNER', 'SALON_OWNER', 'SPA_WELLNESS_OWNER', 'MAKEUP_BRIDAL_OWNER', 'SKIN_DERMA_OWNER', null],
      default: null,
    },

    // ==========================================
    // ADDRESS INFO
    // ==========================================
    address: {
      type: String,
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

    // ==========================================
    // STATUS & APPROVAL
    // ==========================================
    role: {
      type: String,
      enum: ['owner'],
      default: 'owner',
    },
    status: {
      type: String,
      enum: ['mobile_verified', 'salon_registered', 'approved', 'active', 'inactive', 'banned'],
      default: 'mobile_verified',
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
    // APPROVAL DETAILS
    // ==========================================
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvalDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },

    // ==========================================
    // BUSINESS STATS
    // ==========================================
    totalServices: {
      type: Number,
      default: 0,
    },
    totalBarbers: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
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

    // ==========================================
    // BANKING INFORMATION (Encrypted)
    // ==========================================
    bankAccountNumber: {
      type: String,
      select: false, // Don't return by default for security
    },
    ifscCode: {
      type: String,
      select: false,
    },
    accountHolderName: {
      type: String,
      select: false,
    },

    // ==========================================
    // DOCUMENTS
    // ==========================================
    documents: [
      {
        type: {
          type: String,
          enum: ['aadhar', 'pan', 'gst', 'license'],
        },
        url: String, // Cloudinary URL
        verified: {
          type: Boolean,
          default: false,
        },
        uploadedAt: Date,
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
    // AUTHENTICATION TOKENS
    // ==========================================
    lastLogin: {
      type: Date,
      default: null,
    },
    pushToken: {
      type: String,
      default: null,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==========================================
    // SETTINGS
    // ==========================================
    autoConfirmBookings: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // REFERRAL
    // ==========================================
    referredBy: {
      type: require('mongoose').Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    referralCode: {
      type: String,
      default: null,
    },
    referralAppliedAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // SUBSCRIPTION / BILLING
    // ==========================================
    subscription: {
      trialStartDate: {
        type: Date,
        default: Date.now,
      },
      planType: {
        type: String,
        enum: ['free_trial', 'starter', 'per_booking'],
        default: 'free_trial',
      },
      billingCycleStart: {
        type: Date,
        default: null,
      },
      monthlyBookingCount: {
        type: Number,
        default: 0,
      },
      lastPaymentDate: {
        type: Date,
        default: null,
      },
      paymentStatus: {
        type: String,
        enum: ['trial', 'paid', 'overdue'],
        default: 'trial',
      },
      razorpaySubscriptionId: {
        type: String,
        default: null,
      },
      trialEndReminderSent: {
        type: Boolean,
        default: false,
      },
      paymentDueReminderSent: {
        type: Boolean,
        default: false,
      },

      // ── Plan pre-selection during trial ──────────────────────
      // User may optionally pick a plan before trial ends.
      // Activates automatically when trial expires.
      planSelectedDuringTrial: {
        type: String,
        enum: ['starter', 'per_booking', null],
        default: null,
      },

      // ── Scheduled plan change (anti-abuse: 1 per cycle) ──────
      nextPlan: {
        type: String,
        enum: ['starter', 'per_booking', null],
        default: null,
      },
      planChangeRequested: {
        type: Boolean,
        default: false,
      },
      planChangeRequestedAt: {
        type: Date,
        default: null,
      },

      // ── Billing cycle end date ────────────────────────────────
      billingCycleEndDate: {
        type: Date,
        default: null,
      },
    },

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
ownerSchema.index({ phone: 1 });
ownerSchema.index({ email: 1 });
ownerSchema.index({ businessId: 1 });
ownerSchema.index({ city: 1 });
ownerSchema.index({ status: 1 });
ownerSchema.index({ approvalStatus: 1 });
ownerSchema.index({ createdAt: -1 });

// ===================================================
// MIDDLEWARE - HASH PASSWORD BEFORE SAVE
// ===================================================
ownerSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ===================================================
// METHOD - COMPARE PASSWORD
// ===================================================
ownerSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

// ===================================================
// METHOD - GET PUBLIC PROFILE
// ===================================================
ownerSchema.methods.getPublicProfile = function () {
  const owner = this.toObject();
  delete owner.password;
  delete owner.isBanned;
  delete owner.bankAccountNumber;
  delete owner.ifscCode;
  delete owner.accountHolderName;
  return owner;
};

// ===================================================
// METHOD - UPDATE STATS
// ===================================================
ownerSchema.methods.updateStats = async function () {
  try {
    const Business = mongoose.model('Business');
    const Booking = mongoose.model('Booking');
    const Review = mongoose.model('Review');

    // Get business
    const business = await Business.findById(this.businessId);
    if (!business) return;

    // Count services
    const serviceCount = await mongoose.model('Service').countDocuments({ salonId: this.businessId });
    this.totalServices = serviceCount;

    // Count barbers
    const barberCount = await mongoose.model('Barber').countDocuments({ salonId: this.businessId });
    this.totalBarbers = barberCount;

    // Count bookings
    const bookingCount = await Booking.countDocuments({ salonId: this.businessId });
    this.totalBookings = bookingCount;

    // Calculate revenue
    const bookings = await Booking.find({ salonId: this.businessId, status: 'completed' });
    this.totalRevenue = bookings.reduce((sum, booking) => sum + booking.totalAmount, 0);

    // Get average rating
    const reviews = await Review.find({ salonId: this.businessId });
    if (reviews.length > 0) {
      const avgRating = reviews.reduce((sum, review) => sum + review.salonRating, 0) / reviews.length;
      this.averageRating = Math.round(avgRating * 10) / 10;
      this.totalReviews = reviews.length;
    }

    await this.save();
  } catch (error) {
    console.error('Error updating owner stats:', error);
  }
};

// ===================================================
// VIRTUAL - IS BUSINESS APPROVED
// ===================================================
ownerSchema.virtual('isBusinessApproved').get(function () {
  return this.approvalStatus === 'approved';
});

// ===================================================
// VIRTUAL - CAN ADD SERVICES
// ===================================================
ownerSchema.virtual('canAddServices').get(function () {
  return this.status === 'approved' && this.isBusinessApproved;
});

module.exports = mongoose.model('Owner', ownerSchema);
