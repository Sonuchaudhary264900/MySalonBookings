// controllers/auth/ownerAuthController.js
/*
  Owner Authentication Controller
  Handles:
  - Send OTP to phone
  - Verify OTP and complete registration
  - Login with phone and password
  - Logout
  - Get current owner
  - Refresh token
*/

const Owner = require('../../models/Owner');
const OTP = require('../../models/OTP');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateOwnerRegistration, validatePhone, validatePassword } = require('../../utils/validators');
const { generateOTP, generateUniqueId } = require('../../utils/helpers');
const messages = require('../../utils/messages');
const { sendOTPEmail } = require('../../config/emailConfig');

// ===================================================
// SEND OTP FOR REGISTRATION
// ===================================================
exports.sendOTP = async (req, res) => {
  try {
    const { phone, email } = req.body;

    // Validate phone
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json(
        formatErrorResponse('Please provide a valid phone number with country code', 400)
      );
    }

    // Check if phone is already registered
    const existingByPhone = await Owner.findOne({ phone });
    if (existingByPhone) {
      return res.status(409).json(
        formatErrorResponse(messages.AUTH.PHONE_ALREADY_EXISTS, 409)
      );
    }

    // Check if email is already registered (if provided)
    if (email) {
      const existingByEmail = await Owner.findOne({ email: email.toLowerCase().trim() });
      if (existingByEmail) {
        return res.status(409).json(
          formatErrorResponse('This email is already registered. Please use a different email or log in.', 409)
        );
      }
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing OTP for this phone
    await OTP.deleteMany({ phone, userType: 'owner' });

    // Save OTP to database
    await OTP.create({
      phone,
      otp: await bcrypt.hash(otp, 10),
      purpose: 'registration',
      userType: 'owner',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP via email if provided
    const otpSentVia = [];
    if (email) {
      try {
        await sendOTPEmail(email, otp, 'owner');
        otpSentVia.push('email');
      } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr.message);
      }
    }

    // In development, also log OTP to console for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 OTP for ${phone}: ${otp}`);
    }

    res.json(
      formatSuccessResponse(
        { phone, otpSentVia: otpSentVia.length ? otpSentVia.join(' and ') : 'generated' },
        messages.AUTH.OTP_SENT,
        200
      )
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};
// ===================================================
// VERIFY OTP ONLY
// ===================================================
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json(
        formatErrorResponse("Phone and OTP are required", 400)
      );
    }

    // Validate OTP format
    if (otp.length !== 6) {
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.INVALID_OTP, 400)
      );
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      phone,
      purpose: "registration",
      userType: "owner",
    });

    if (!otpRecord) {
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.INVALID_OTP, 400)
      );
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });

      return res.status(400).json(
        formatErrorResponse(messages.AUTH.OTP_EXPIRED, 400)
      );
    }

    // Compare OTP
    const isOTPValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isOTPValid) {
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.INVALID_OTP, 400)
      );
    }

    res.json(
      formatSuccessResponse(
        { phone },
        "OTP verified successfully",
        200
      )
    );

  } catch (error) {
    console.error("Error verifying OTP:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// VERIFY OTP AND REGISTER OWNER
// ===================================================
exports.verifyOTPAndRegister = async (req, res) => {
  try {
    const { phone, otp, name, email, password } = req.body;

    // Validate input
    const validation = validateOwnerRegistration({ phone, name, email, password });
    if (!validation.valid) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, validation.errors)
      );
    }

    // Validate OTP
    if (!otp || otp.length !== 6) {
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.INVALID_OTP, 400)
      );
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
      phone,
      purpose: 'registration',
      userType: 'owner',
    });

    if (!otpRecord) {
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.INVALID_OTP, 400)
      );
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.OTP_EXPIRED, 400)
      );
    }

    // Compare OTP
    const isOTPValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isOTPValid) {
      return res.status(400).json(
        formatErrorResponse(messages.AUTH.INVALID_OTP, 400)
      );
    }

    // Check if owner already exists
    const existingOwner = await Owner.findOne({
      $or: [{ phone }, { email }],
    });

    if (existingOwner) {
      return res.status(409).json(
        formatErrorResponse('Email or phone already registered', 409)
      );
    }

    // Create owner
    const owner = await Owner.create({
      phone,
      phoneVerified: true,
      name,
      email,
      password,
      status: 'mobile_verified',
      role: 'owner',
    });

    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: owner._id,
        phone: owner.phone,
        role: owner.role,
        businessId: owner.businessId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { _id: owner._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    // Save refresh token
    owner.refreshTokens.push({ token: refreshToken });
    await owner.save();

    // Send welcome email
    try {
      await sendOTPEmail(owner.email, otp, 'owner');
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }

    res.status(201).json(
      formatSuccessResponse(
        {
          owner: owner.getPublicProfile(),
          token,
          refreshToken,
        },
        messages.AUTH.REGISTRATION_SUCCESS,
        201
      )
    );
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      return res.status(409).json(
        formatErrorResponse(`${field === 'phone' ? 'Phone number' : 'Email'} is already registered`, 409)
      );
    }
    console.error('Error verifying OTP:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// LOGIN OWNER (Email OR Phone)
// ===================================================
exports.login = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    // ==========================================
    // VALIDATE INPUT
    // ==========================================
    if (!identifier || !password) {
      return res.status(400).json(
        formatErrorResponse("Email/Phone and password are required", 400)
      );
    }

    let owner;

    // ==========================================
    // CHECK IF IDENTIFIER IS EMAIL
    // ==========================================
    if (identifier.includes("@")) {
      const email = identifier.toLowerCase().trim();

      owner = await Owner.findOne({ email }).select("+password +isBanned");
    } 
    // ==========================================
    // OTHERWISE TREAT AS PHONE
    // ==========================================
    else {
      let phone = String(identifier);

      // remove spaces and non-digit characters except leading +
      phone = phone.replace(/\D/g, "");

      // convert to +91 format
      if (phone.length === 10) {
        phone = "+91" + phone;
      } else if (phone.length === 12 && phone.startsWith("91")) {
        phone = "+" + phone;
      }

      owner = await Owner.findOne({ phone }).select("+password +isBanned");
    }

    // ==========================================
    // USER NOT FOUND
    // ==========================================
    if (!owner) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
      );
    }

    // ==========================================
    // CHECK IF BANNED
    // ==========================================
    if (owner.isBanned) {
      return res.status(403).json(
        formatErrorResponse("Your account has been banned", 403)
      );
    }

    // ==========================================
    // CHECK PASSWORD
    // ==========================================
    const isPasswordValid = await owner.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
      );
    }

    // ==========================================
    // UPDATE LAST LOGIN
    // ==========================================
    await owner.constructor.updateOne({ _id: owner._id }, { lastLogin: new Date() });

    // ==========================================
    // GENERATE ACCESS TOKEN
    // ==========================================
    const token = jwt.sign(
      {
        _id: owner._id,
        phone: owner.phone,
        role: owner.role,
        businessId: owner.businessId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "24h" }
    );

    // ==========================================
    // GENERATE REFRESH TOKEN
    // ==========================================
    const refreshToken = jwt.sign(
      { _id: owner._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" }
    );

    await owner.constructor.updateOne(
      { _id: owner._id },
      { $push: { refreshTokens: { token: refreshToken } } }
    );

    // ==========================================
    // RESPONSE
    // ==========================================
    res.json(
      formatSuccessResponse(
        {
          owner: owner.getPublicProfile(),
          token,
          refreshToken,
        },
        messages.AUTH.LOGIN_SUCCESS
      )
    );

  } catch (error) {
    console.error("Error during login:", error);

    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// GET CURRENT OWNER
// ===================================================
exports.getCurrentOwner = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id)
      .populate('businessId')
      .lean();

    if (!owner) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    res.json(
      formatSuccessResponse(owner, messages.GENERIC.RETRIEVED)
    );
  } catch (error) {
    console.error('Error getting current owner:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// UPDATE PROFILE
// ===================================================
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, profilePhoto, gender } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(
        formatErrorResponse('Name is required', 400)
      );
    }

    const owner = await Owner.findById(req.owner._id);
    if (!owner) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    if (email && email !== owner.email) {
      const existing = await Owner.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json(
          formatErrorResponse('Email already in use', 409)
        );
      }
      owner.email = email.toLowerCase().trim();
    }

    owner.name = name.trim();
    if (profilePhoto !== undefined) owner.profilePhoto = profilePhoto;
    if (gender && ['male', 'female', 'other'].includes(gender)) owner.gender = gender;
    await owner.save();

    res.json(
      formatSuccessResponse(owner.getPublicProfile(), 'Profile updated successfully')
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// CHANGE PASSWORD
// ===================================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        formatErrorResponse('Current password and new password are required', 400)
      );
    }

    if (newPassword.length < 8) {
      return res.status(400).json(
        formatErrorResponse('New password must be at least 8 characters', 400)
      );
    }

    const owner = await Owner.findById(req.owner._id).select('+password');
    if (!owner) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    const isValid = await owner.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json(
        formatErrorResponse('Current password is incorrect', 401)
      );
    }

    owner.password = newPassword;
    await owner.save();

    res.json(
      formatSuccessResponse(null, 'Password changed successfully')
    );
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// DELETE ACCOUNT
// ===================================================
exports.deleteAccount = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json(
        formatErrorResponse('Email/phone and password are required', 400)
      );
    }

    // Find owner by email or phone (same logic as login)
    let owner;
    if (String(identifier).includes('@')) {
      owner = await Owner.findOne({ email: identifier.toLowerCase().trim() }).select('+password');
    } else {
      let phone = String(identifier).replace(/\D/g, '');
      if (phone.length === 10) phone = '+91' + phone;
      else if (phone.length === 12 && phone.startsWith('91')) phone = '+' + phone;
      owner = await Owner.findOne({ phone }).select('+password');
    }

    if (!owner) {
      return res.status(404).json(
        formatErrorResponse('Account not found', 404)
      );
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(401).json(
        formatErrorResponse('Incorrect password', 401)
      );
    }

    const Business             = require('../../models/Business');
    const Service              = require('../../models/Service');
    const Review               = require('../../models/Review');
    const Coupon               = require('../../models/Coupon');
    const Package              = require('../../models/Package');
    const UserPackage          = require('../../models/UserPackage');
    const Barber               = require('../../models/Barber');
    const Booking              = require('../../models/Booking');
    const Subscription         = require('../../models/Subscription');
    const SubscriptionLog      = require('../../models/SubscriptionLog');
    const Message              = require('../../models/Message');
    const Transaction          = require('../../models/Transaction');
    const Queue                = require('../../models/Queue');
    const ReelLike             = require('../../models/ReelLike');
    const ReelComment          = require('../../models/ReelComment');
    const ReelView             = require('../../models/ReelView');
    const ReelInteraction      = require('../../models/ReelInteraction');
    const NotificationSettings = require('../../models/NotificationSettings');
    const NotificationCampaign = require('../../models/NotificationCampaign');
    const Promotion            = require('../../models/Promotion');
    const OTP                  = require('../../models/OTP');

    const salon = await Business.findOne({ ownerId: owner._id });
    if (salon) {
      const sid = salon._id;
      await Promise.all([
        Service.deleteMany({ salonId: sid }),
        Review.deleteMany({ salonId: sid }),
        Coupon.deleteMany({ salonId: sid }),
        Package.deleteMany({ salonId: sid }),
        UserPackage.deleteMany({ salonId: sid }),
        Barber.deleteMany({ salonId: sid }),
        Booking.deleteMany({ salonId: sid }),
        Subscription.deleteMany({ salonId: sid }),
        SubscriptionLog.deleteMany({ salonId: sid }),
        Message.deleteMany({ salonId: sid }),
        Transaction.deleteMany({ salonId: sid }),
        Queue.deleteMany({ salonId: sid }),
        ReelLike.deleteMany({ salonId: sid }),
        ReelComment.deleteMany({ salonId: sid }),
        ReelView.deleteMany({ salonId: sid }),
        ReelInteraction.deleteMany({ salonId: sid }),
        NotificationSettings.deleteMany({ salonId: sid }),
        NotificationCampaign.deleteMany({ salonId: sid }),
        Promotion.deleteMany({ salonId: sid }),
      ]);
      await salon.deleteOne();
    }

    // Clean up owner-level data (not tied to a specific salon)
    await Promise.all([
      SubscriptionLog.deleteMany({ ownerId: owner._id }),
      OTP.deleteMany({
        $or: [
          ...(owner.phone ? [{ phone: owner.phone }] : []),
          ...(owner.email ? [{ email: owner.email }] : []),
        ],
      }),
    ]);

    await Owner.findByIdAndDelete(owner._id);

    res.json(formatSuccessResponse(null, 'Account permanently deleted'));
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// FIREBASE PHONE AUTH - RESET PASSWORD
// ===================================================
exports.firebaseResetPassword = async (req, res) => {
  try {
    const { firebaseToken, newPassword } = req.body;

    if (!firebaseToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Firebase token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    const firebaseUser = await verifyFirebaseToken(firebaseToken);
    const phone = firebaseUser.phone;

    const owner = await Owner.findOne({ phone });
    if (!owner) {
      return res.status(404).json({ success: false, message: 'No account found with this phone number' });
    }

    owner.password = newPassword;
    owner.refreshTokens = [];
    await owner.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error in owner firebase reset password:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// ===================================================
// FIREBASE PHONE AUTH REGISTER
// ===================================================
exports.firebaseRegister = async (req, res) => {
  try {
    const { firebaseToken, name, email, gender } = req.body;

    if (!firebaseToken) {
      return res.status(400).json(
        formatErrorResponse('Firebase token is required', 400)
      );
    }

    // Validate name and email (phone comes from Firebase, no password required)
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Valid name is required');
    if (!email || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) errors.push('Valid email is required');
    if (gender && !['male', 'female', 'other'].includes(gender)) errors.push('Gender must be male, female, or other');
    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, errors)
      );
    }

    // Verify Firebase token and extract phone number
    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    const firebaseUser = await verifyFirebaseToken(firebaseToken);
    const phone = firebaseUser.phone;
    const regDigits = phone.replace(/\D/g, '');
    const regTen = regDigits.length >= 10 ? regDigits.slice(-10) : regDigits;

    // Check if owner already exists (robust: match exact variants OR last 10 digits OR email)
    const regVariants = [phone, `+91${regTen}`, `91${regTen}`, regTen];
    const existingOwner = await Owner.findOne({
      $or: [
        { phone: { $in: regVariants } },
        { phone: { $regex: regTen + '$' } },
        { email: email.toLowerCase().trim() },
      ],
    });
    if (existingOwner) {
      // Phone is Firebase-verified — if the phone matches, auto-login
      if (existingOwner.phone === phone || existingOwner.phone.replace(/\D/g,'').slice(-10) === regTen) {
        const token = jwt.sign(
          { _id: existingOwner._id, phone: existingOwner.phone, role: existingOwner.role, businessId: existingOwner.businessId },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );
        const refreshToken = jwt.sign(
          { _id: existingOwner._id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );
        existingOwner.refreshTokens.push({ token: refreshToken });
        await existingOwner.save();
        return res.status(200).json(
          formatSuccessResponse(
            { owner: existingOwner.getPublicProfile(), token, refreshToken },
            'Account already exists. Logged in successfully.',
            200
          )
        );
      }
      // Email conflict with a different account
      return res.status(409).json(
        formatErrorResponse('Email is already registered with another account', 409)
      );
    }

    // Create owner (passwordless — Firebase OTP is the authentication factor)
    const owner = await Owner.create({
      phone,
      phoneVerified: true,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      gender: gender || null,
      status: 'mobile_verified',
      role: 'owner',
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: owner._id,
        phone: owner.phone,
        role: owner.role,
        businessId: owner.businessId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { _id: owner._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    owner.refreshTokens.push({ token: refreshToken });
    await owner.save();

    res.status(201).json(
      formatSuccessResponse(
        {
          owner: owner.getPublicProfile(),
          token,
          refreshToken,
        },
        messages.AUTH.REGISTRATION_SUCCESS,
        201
      )
    );
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      return res.status(409).json(
        formatErrorResponse(`${field === 'phone' ? 'Phone number' : 'Email'} is already registered`, 409)
      );
    }
    console.error('Error in firebase register:', error);
    res.status(500).json(
      formatErrorResponse(error.message || messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// REFRESH TOKEN
// ===================================================
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json(
        formatErrorResponse('Refresh token is required', 400)
      );
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find owner
    const owner = await Owner.findById(decoded._id);
    if (!owner) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    // Check if refresh token exists in database
    const tokenExists = owner.refreshTokens.some(
      (rt) => rt.token === refreshToken
    );

    if (!tokenExists) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.SESSION_EXPIRED, 401)
      );
    }

    // Generate new token
    const newToken = jwt.sign(
      {
        _id: owner._id,
        phone: owner.phone,
        role: owner.role,
        businessId: owner.businessId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.json(
      formatSuccessResponse(
        { token: newToken },
        'Token refreshed successfully'
      )
    );
  } catch (error) {
    console.error('Error refreshing token:', error);
    if (error.message === 'jwt expired') {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.SESSION_EXPIRED, 401)
      );
    }

    res.status(401).json(
      formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
    );
  }
};

// ===================================================
// FORGOT PASSWORD — SEND OTP
// ===================================================
exports.forgotPasswordSendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json(formatErrorResponse('Please provide a valid phone number with country code', 400));
    }
    const owner = await Owner.findOne({ phone });
    if (!owner) {
      return res.status(404).json(formatErrorResponse('No account found with this phone number', 404));
    }
    const otp = generateOTP();
    await OTP.deleteMany({ phone, purpose: 'password_reset', userType: 'owner' });
    await OTP.create({
      phone,
      otp: await bcrypt.hash(otp, 10),
      purpose: 'password_reset',
      userType: 'owner',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    let emailSent = false;
    if (owner.email) {
      try {
        await sendOTPEmail(owner.email, otp, 'owner');
        emailSent = true;
      } catch (e) {
        console.error('Failed to send OTP email:', e.message);
      }
    }
    // Always log OTP so it's visible in server logs (Render dashboard) during debugging
    console.log(`🔑 Password reset OTP for ${phone}: ${otp} | email_sent=${emailSent}`);
    res.json(formatSuccessResponse({ phone, emailSent }, 'OTP sent successfully'));
  } catch (error) {
    console.error('Error sending forgot-password OTP:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// FORGOT PASSWORD — RESET
// ===================================================
exports.forgotPasswordReset = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json(formatErrorResponse('Phone, OTP, and new password are required', 400));
    }
    if (newPassword.length < 8) {
      return res.status(400).json(formatErrorResponse('Password must be at least 8 characters', 400));
    }
    const record = await OTP.findOne({ phone, purpose: 'password_reset', userType: 'owner' });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json(formatErrorResponse('OTP expired or not found. Please request a new one.', 400));
    }
    const valid = await bcrypt.compare(otp, record.otp);
    if (!valid) {
      return res.status(400).json(formatErrorResponse('Invalid OTP', 400));
    }
    const owner = await Owner.findOne({ phone });
    if (!owner) {
      return res.status(404).json(formatErrorResponse('Account not found', 404));
    }
    owner.password = newPassword;
    await owner.save();
    await OTP.deleteMany({ phone, purpose: 'password_reset', userType: 'owner' });
    res.json(formatSuccessResponse(null, 'Password reset successfully'));
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// LOGOUT
// ===================================================
// ===================================================
// FIREBASE PHONE AUTH - LOGIN (OTP-based, no password)
// ===================================================
exports.firebaseLogin = async (req, res) => {
  try {
    const { firebaseToken, phone: clientPhone } = req.body;
    if (!firebaseToken) {
      return res.status(400).json(formatErrorResponse('Firebase token is required', 400));
    }

    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(firebaseToken);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('TOKEN_EXPIRED')) {
        return res.status(401).json(formatErrorResponse('OTP session expired. Please try again.', 401));
      }
      return res.status(401).json(formatErrorResponse('Invalid or expired Firebase token.', 401));
    }

    const rawPhone = firebaseUser.phone.trim();
    const digits = rawPhone.replace(/\D/g, '');
    const tenDigit = digits.length >= 10 ? digits.slice(-10) : digits;

    // Build every plausible stored format from Firebase phone
    const variantSet = new Set([
      rawPhone,
      `+91${tenDigit}`,
      `91${tenDigit}`,
      tenDigit,
      `0${tenDigit}`,
    ]);

    // Also add variants derived from the client-supplied phone (what the user typed)
    // This handles any DB format mismatch regardless of how the account was registered
    if (clientPhone) {
      const cd = String(clientPhone).replace(/\D/g, '');
      const ct = cd.length >= 10 ? cd.slice(-10) : cd;
      variantSet.add(clientPhone.trim());
      variantSet.add(`+91${ct}`);
      variantSet.add(`91${ct}`);
      variantSet.add(ct);
      variantSet.add(`0${ct}`);
    }

    const phoneVariants = [...variantSet];
    console.log(`[owner firebaseLogin] firebase="${rawPhone}" client="${clientPhone || ''}" variants=${JSON.stringify(phoneVariants)}`);

    // Lookup: exact match on all variants first, then end-of-string regex
    let owner = await Owner.findOne({
      $or: [
        { phone: { $in: phoneVariants } },
        { phone: { $regex: tenDigit + '$' } },
      ],
    }).select('+isBanned');

    console.log(`[owner firebaseLogin] owner: ${owner ? `${owner._id} phone="${owner.phone}"` : 'null'}`);

    // Fallback: match by Business phone → resolve Owner via ownerId
    if (!owner) {
      const Business = require('../../models/Business');
      const business = await Business.findOne({
        $or: [
          { phone: { $in: phoneVariants } },
          { phone: { $regex: tenDigit + '$' } },
        ],
      }).select('ownerId phone name');
      console.log(`[owner firebaseLogin] business fallback: ${business ? `${business._id} phone="${business.phone}" ownerId=${business.ownerId}` : 'null'}`);

      if (business?.ownerId) {
        owner = await Owner.findById(business.ownerId).select('+isBanned');
        console.log(`[owner firebaseLogin] owner via business: ${owner ? `${owner._id}` : 'null — orphan'}`);
      }
    }

    if (!owner) {
      console.log(`[owner firebaseLogin] NOT FOUND — firebase="${rawPhone}" client="${clientPhone || ''}" variants=${JSON.stringify(phoneVariants)}`);
      return res.status(404).json(
        formatErrorResponse(`No GlowLoox Partner account found for ${rawPhone}. Please register to create your account.`, 404)
      );
    }

    if (owner.isBanned) {
      return res.status(403).json(formatErrorResponse('Your account has been suspended.', 403));
    }

    const token = jwt.sign(
      { _id: owner._id, phone: owner.phone, role: owner.role, businessId: owner.businessId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    const refreshToken = jwt.sign(
      { _id: owner._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    owner.refreshTokens = [...(owner.refreshTokens || []).slice(-4), { token: refreshToken }];
    await owner.save();

    return res.status(200).json(
      formatSuccessResponse({ owner: owner.getPublicProfile(), token, refreshToken }, 'Login successful')
    );
  } catch (error) {
    console.error('Error in owner firebaseLogin:', error);
    res.status(500).json(formatErrorResponse(error.message || messages.GENERIC.ERROR, 500));
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const update = { expoPushToken: null };
    if (refreshToken) update.$pull = { refreshTokens: { token: refreshToken } };

    await Owner.findByIdAndUpdate(req.owner._id, update);

    res.json(
      formatSuccessResponse(null, messages.AUTH.LOGOUT_SUCCESS)
    );
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};
