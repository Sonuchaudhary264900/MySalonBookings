// controllers/auth/customerAuthController.js
/*
  Customer Authentication Controller
  Handles:
  - Send OTP to phone or email
  - Verify OTP and register
  - Login with phone or email
  - Register with email
  - Logout
  - Get current customer
  - Refresh token
*/

const Customer = require('../../models/Customer');
const OTP = require('../../models/OTP');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { validateCustomerRegistration, validatePhone, validateEmail } = require('../../utils/validators');
const { generateOTP, generateReferralCode } = require('../../utils/helpers');
const messages = require('../../utils/messages');


// ===================================================
// SEND OTP TO PHONE
// ===================================================
exports.sendOTPToPhone = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone
    if (!phone || !validatePhone(phone)) {
      return res.status(400).json(
        formatErrorResponse('Please provide a valid phone number with country code', 400)
      );
    }

    // Check if customer with this phone exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(409).json(
        formatErrorResponse(messages.AUTH.PHONE_ALREADY_EXISTS, 409)
      );
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete any existing OTP for this phone
    await OTP.deleteMany({ phone, userType: 'customer' });

    // Save OTP to database
    await OTP.create({
      phone,
      otp: await bcrypt.hash(otp, 10),
      purpose: 'registration',
      userType: 'customer',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });


    res.json(
      formatSuccessResponse(
        { phone, otpSentVia: 'SMS' },
        messages.AUTH.OTP_SENT
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
// VERIFY OTP ONLY (before registration)
// ===================================================
exports.verifyOTPOnly = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp || otp.length !== 6) {
      return res.status(400).json(
        formatErrorResponse('Phone and 6-digit OTP are required', 400)
      );
    }

    const otpRecord = await OTP.findOne({ phone, purpose: 'registration', userType: 'customer' });

    if (!otpRecord) {
      return res.status(400).json(
        formatErrorResponse('OTP not found or expired. Please request a new OTP.', 400)
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json(
        formatErrorResponse('OTP has expired. Please request a new one.', 400)
      );
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);
    if (!isValid) {
      return res.status(400).json(
        formatErrorResponse('Incorrect OTP. Please try again.', 400)
      );
    }

    res.json(formatSuccessResponse({ phone }, 'OTP verified successfully'));
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// VERIFY OTP AND REGISTER CUSTOMER
// ===================================================
exports.verifyOTPAndRegister = async (req, res) => {
  try {
    const { phone, otp, name, gender, password } = req.body;


    // Validate input
    const validation = validateCustomerRegistration({
      phone,
      name,
      gender,
      password,
    });

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
      userType: 'customer',
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

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(409).json(
        formatErrorResponse('Phone already registered', 409)
      );
    }

    // Create customer
    const customer = await Customer.create({
      phone,
      phoneVerified: true,
      name,
      gender,
      password: password || null,
      role: 'customer',
    });

    // Generate referral code using the new customer's ID
    customer.referralCode = generateReferralCode(customer._id);

    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: customer._id,
        phone: customer.phone,
        role: customer.role,
        gender: customer.gender,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { _id: customer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    // Save refresh token
    customer.refreshTokens.push({ token: refreshToken });
    await customer.save();

    res.status(201).json(
      formatSuccessResponse(
        {
          customer: customer.getPublicProfile(),
          token,
          refreshToken,
        },
        messages.AUTH.REGISTRATION_SUCCESS,
        201
      )
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// FIREBASE UNIFIED AUTH (LOGIN + REGISTER)
// ===================================================
exports.firebaseAuth = async (req, res) => {
  try {
    const { firebaseToken, name } = req.body;

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

    const phone = firebaseUser.phone.trim();
    const customer = await Customer.findOne({ phone }).select('+isBanned');

    // --- EXISTING USER ---
    if (customer) {
      if (customer.isBanned) {
        return res.status(403).json(formatErrorResponse('Your account has been suspended.', 403));
      }

      const token = jwt.sign(
        { _id: customer._id, phone: customer.phone, role: customer.role, gender: customer.gender },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );
      const refreshToken = jwt.sign(
        { _id: customer._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
      );
      customer.refreshTokens = [...(customer.refreshTokens || []).slice(-4), { token: refreshToken }];
      await customer.save();
      console.log('firebase-auth login:', phone.slice(0, 6) + '****');
      return res.status(200).json(
        formatSuccessResponse({ customer: customer.getPublicProfile(), token, refreshToken, isNew: false }, 'Login successful')
      );
    }

    // --- NEW USER: name not provided yet ---
    if (!name || name.trim().length < 2) {
      if (!name) {
        return res.status(200).json(
          formatSuccessResponse({ needsName: true }, 'Name required to create account')
        );
      }
      return res.status(400).json(formatErrorResponse('Name must be at least 2 characters', 400));
    }

    // --- NEW USER: create account ---
    const sanitizedName = name.trim().replace(/[<>\/\\]/g, '').slice(0, 60);
    if (sanitizedName.length < 2) {
      return res.status(400).json(formatErrorResponse('Name must be at least 2 characters', 400));
    }

    let newCustomer;
    try {
      newCustomer = await Customer.create({
        phone,
        phoneVerified: true,
        name: sanitizedName,
        role: 'customer',
      });
      newCustomer.referralCode = generateReferralCode(newCustomer._id);
    } catch (err) {
      if (err.code === 11000) {
        // Race condition — another request already created the account
        newCustomer = await Customer.findOne({ phone });
      } else {
        throw err;
      }
    }

    const token = jwt.sign(
      { _id: newCustomer._id, phone: newCustomer.phone, role: newCustomer.role, gender: newCustomer.gender },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    const refreshToken = jwt.sign(
      { _id: newCustomer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    newCustomer.refreshTokens = [...(newCustomer.refreshTokens || []).slice(-4), { token: refreshToken }];
    await newCustomer.save();
    console.log('firebase-auth register:', phone.slice(0, 6) + '****');
    return res.status(201).json(
      formatSuccessResponse({ customer: newCustomer.getPublicProfile(), token, refreshToken, isNew: true }, 'Account created successfully', 201)
    );
  } catch (error) {
    console.error('Error in firebase-auth:', error);
    res.status(500).json(formatErrorResponse(error.message || messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// FIREBASE PHONE AUTH REGISTER (CUSTOMER)
// ===================================================
exports.firebaseRegister = async (req, res) => {
  try {
    const { firebaseToken, name, password, gender } = req.body;

    if (!firebaseToken) {
      return res.status(400).json(
        formatErrorResponse('Firebase token is required', 400)
      );
    }

    // Validate fields
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Valid name is required');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters');
    if (gender && !['male', 'female', 'other'].includes(gender)) errors.push('Gender must be male, female, or other');
    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, errors)
      );
    }

    // Verify Firebase token and extract phone
    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    const firebaseUser = await verifyFirebaseToken(firebaseToken);
    const phone = firebaseUser.phone;

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ phone });
    if (existingCustomer) {
      return res.status(409).json(
        formatErrorResponse('Phone already registered', 409)
      );
    }

    // Create customer
    const customer = await Customer.create({
      phone,
      phoneVerified: true,
      name: name.trim(),
      gender,
      password,
      role: 'customer',
    });

    customer.referralCode = generateReferralCode(customer._id);
    await customer.save();

    // Generate tokens
    const token = jwt.sign(
      { _id: customer._id, phone: customer.phone, role: customer.role, gender: customer.gender },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    const refreshToken = jwt.sign(
      { _id: customer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    customer.refreshTokens.push({ token: refreshToken });
    await customer.save();

    res.status(201).json(
      formatSuccessResponse(
        { customer: customer.getPublicProfile(), token, refreshToken },
        messages.AUTH.REGISTRATION_SUCCESS,
        201
      )
    );
  } catch (error) {
    console.error('Error in customer firebase register:', error);
    res.status(500).json(
      formatErrorResponse(error.message || messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// FIREBASE PHONE AUTH - LOGIN (OTP-based, no password)
// ===================================================
exports.firebaseLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken) {
      return res.status(400).json(formatErrorResponse('Firebase token is required', 400));
    }

    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    const firebaseUser = await verifyFirebaseToken(firebaseToken);
    const phone = firebaseUser.phone;

    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json(
        formatErrorResponse('No account found with this phone number. Please register first.', 404)
      );
    }

    const token = jwt.sign(
      { _id: customer._id, phone: customer.phone, role: customer.role, gender: customer.gender },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    const refreshToken = jwt.sign(
      { _id: customer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    customer.refreshTokens.push({ token: refreshToken });
    await customer.save();

    res.status(200).json(
      formatSuccessResponse(
        { customer: customer.getPublicProfile(), token, refreshToken },
        'Login successful',
        200
      )
    );
  } catch (error) {
    console.error('Error in customer firebase login:', error);
    res.status(500).json(formatErrorResponse(error.message || messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// FIREBASE PHONE AUTH - RESET PASSWORD
// ===================================================
exports.firebaseResetPassword = async (req, res) => {
  try {
    const { firebaseToken, newPassword } = req.body;

    if (!firebaseToken || !newPassword) {
      return res.status(400).json(
        formatErrorResponse('Firebase token and new password are required', 400)
      );
    }
    if (newPassword.length < 6) {
      return res.status(400).json(
        formatErrorResponse('Password must be at least 6 characters', 400)
      );
    }

    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    const firebaseUser = await verifyFirebaseToken(firebaseToken);
    const phone = firebaseUser.phone;

    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json(
        formatErrorResponse('No account found with this phone number', 404)
      );
    }

    customer.password = newPassword;
    // Invalidate all refresh tokens on password reset
    customer.refreshTokens = [];
    await customer.save();

    res.json(
      formatSuccessResponse(null, 'Password reset successfully')
    );
  } catch (error) {
    console.error('Error in firebase reset password:', error);
    res.status(500).json(
      formatErrorResponse(error.message || messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// LOGIN WITH PHONE & PASSWORD
// ===================================================
exports.loginWithPhone = async (req, res) => {
  try {
    let { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json(
        formatErrorResponse('Phone and password are required', 400)
      );
    }

    // Normalize phone to +91XXXXXXXXXX
    let normalized = String(phone).replace(/\D/g, '');
    if (normalized.length === 10) normalized = '91' + normalized;
    if (normalized.length === 12 && normalized.startsWith('91')) normalized = '+' + normalized;
    else if (!normalized.startsWith('+')) normalized = '+' + normalized;
    phone = normalized;

    // Find customer
    const customer = await Customer.findOne({ phone }).select('+password');
    if (!customer) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
      );
    }

    // Check if customer is banned
    if (customer.isBanned) {
      return res.status(403).json(
        formatErrorResponse('Your account has been banned', 403)
      );
    }

    // Compare password
    const isPasswordValid = await customer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: customer._id,
        phone: customer.phone,
        role: customer.role,
        gender: customer.gender,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { _id: customer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    // Save refresh token
    customer.refreshTokens.push({ token: refreshToken });
    await customer.save();

    res.json(
      formatSuccessResponse(
        {
          customer: customer.getPublicProfile(),
          token,
          refreshToken,
        },
        messages.AUTH.LOGIN_SUCCESS
      )
    );
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// LOGIN WITH EMAIL & PASSWORD
// ===================================================
exports.loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !validateEmail(email) || !password) {
      return res.status(400).json(
        formatErrorResponse('Valid email and password are required', 400)
      );
    }

    // Find customer
    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
      );
    }

    // Check if customer is banned
    if (customer.isBanned) {
      return res.status(403).json(
        formatErrorResponse('Your account has been banned', 403)
      );
    }

    // Compare password
    const isPasswordValid = await customer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json(
        formatErrorResponse(messages.AUTH.INVALID_CREDENTIALS, 401)
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        _id: customer._id,
        email: customer.email,
        role: customer.role,
        gender: customer.gender,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { _id: customer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    // Save refresh token
    customer.refreshTokens.push({ token: refreshToken });
    await customer.save();

    res.json(
      formatSuccessResponse(
        {
          customer: customer.getPublicProfile(),
          token,
          refreshToken,
        },
        messages.AUTH.LOGIN_SUCCESS
      )
    );
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// GET CURRENT CUSTOMER
// ===================================================
exports.getCurrentCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).lean();

    if (!customer) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    res.json(
      formatSuccessResponse(customer, messages.GENERIC.RETRIEVED)
    );
  } catch (error) {
    console.error('Error getting current customer:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// UPDATE CUSTOMER PROFILE
// ===================================================
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, gender } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json(
        formatErrorResponse('Name is required', 400)
      );
    }

    const customer = await Customer.findById(req.customer._id);
    if (!customer) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    if (email && email.trim() !== customer.email) {
      const existing = await Customer.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json(
          formatErrorResponse('Email already in use', 409)
        );
      }
      customer.email = email.toLowerCase().trim();
    }

    customer.name = name.trim();
    if (gender && ['male', 'female'].includes(gender)) customer.gender = gender;
    await customer.save();

    res.json(
      formatSuccessResponse(customer.getPublicProfile(), 'Profile updated successfully')
    );
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
    );
  }
};

// ===================================================
// CHANGE CUSTOMER PASSWORD
// ===================================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json(
        formatErrorResponse('Current password and new password are required', 400)
      );
    }

    if (newPassword.length < 6) {
      return res.status(400).json(
        formatErrorResponse('New password must be at least 6 characters', 400)
      );
    }

    const customer = await Customer.findById(req.customer._id).select('+password');
    if (!customer) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    const isValid = await customer.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json(
        formatErrorResponse('Current password is incorrect', 401)
      );
    }

    customer.password = newPassword;
    await customer.save();

    res.json(
      formatSuccessResponse(null, 'Password changed successfully')
    );
  } catch (error) {
    console.error('Error changing customer password:', error);
    res.status(500).json(
      formatErrorResponse(messages.GENERIC.ERROR, 500)
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

    // Find customer
    const customer = await Customer.findById(decoded._id);
    if (!customer) {
      return res.status(404).json(
        formatErrorResponse(messages.AUTH.USER_NOT_FOUND, 404)
      );
    }

    // Check if refresh token exists
    const tokenExists = customer.refreshTokens.some(
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
        _id: customer._id,
        phone: customer.phone,
        role: customer.role,
        gender: customer.gender,
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
    res.status(401).json(
      formatErrorResponse(messages.AUTH.SESSION_EXPIRED, 401)
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
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json(formatErrorResponse('No account found with this phone number', 404));
    }
    const otp = generateOTP();
    await OTP.deleteMany({ phone, purpose: 'password_reset', userType: 'customer' });
    await OTP.create({
      phone,
      otp: await bcrypt.hash(otp, 10),
      purpose: 'password_reset',
      userType: 'customer',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    if (process.env.NODE_ENV !== 'production') console.log(`🔑 Password reset OTP for ${phone}: ${otp}`);
    res.json(formatSuccessResponse({ phone }, 'OTP sent successfully'));
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
    if (newPassword.length < 6) {
      return res.status(400).json(formatErrorResponse('Password must be at least 6 characters', 400));
    }
    const record = await OTP.findOne({ phone, purpose: 'password_reset', userType: 'customer' });
    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json(formatErrorResponse('OTP expired or not found. Please request a new one.', 400));
    }
    const valid = await bcrypt.compare(otp, record.otp);
    if (!valid) {
      return res.status(400).json(formatErrorResponse('Invalid OTP', 400));
    }
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return res.status(404).json(formatErrorResponse('Account not found', 404));
    }
    customer.password = newPassword;
    await customer.save();
    await OTP.deleteMany({ phone, purpose: 'password_reset', userType: 'customer' });
    res.json(formatSuccessResponse(null, 'Password reset successfully'));
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// LOGOUT
// ===================================================
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const update = { expoPushToken: null };
    if (refreshToken) update.$pull = { refreshTokens: { token: refreshToken } };

    await Customer.findByIdAndUpdate(req.customer._id, update);

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

exports.deleteAccount = async (req, res) => {
  try {
    const customerId = req.customer._id;

    const Booking         = require('../../models/Booking');
    const Review          = require('../../models/Review');
    const UserPackage     = require('../../models/UserPackage');
    const Message         = require('../../models/Message');
    const Transaction     = require('../../models/Transaction');
    const ReelLike        = require('../../models/ReelLike');
    const ReelComment     = require('../../models/ReelComment');
    const ReelInteraction = require('../../models/ReelInteraction');
    const Queue           = require('../../models/Queue');
    const OTP             = require('../../models/OTP');

    // Fetch customer now (before deletion) to get phone/email for OTP cleanup
    const customer = await Customer.findById(customerId).select('phone email');

    await Promise.all([
      Booking.deleteMany({ customerId }),
      Review.deleteMany({ customerId }),
      UserPackage.deleteMany({ customerId }),
      Message.deleteMany({ customerId }),
      Transaction.deleteMany({ customerId }),
      // ReelLike/Comment/Interaction store customerId as String
      ReelLike.deleteMany({ customerId: String(customerId) }),
      ReelComment.deleteMany({ customerId: String(customerId) }),
      ReelInteraction.deleteMany({ customerId: String(customerId) }),
      // Pull customer's entries from all queue documents
      Queue.updateMany(
        { 'queue.customerId': customerId },
        { $pull: { queue: { customerId } } }
      ),
      // Clean up OTPs by phone or email
      customer
        ? OTP.deleteMany({
            $or: [
              ...(customer.phone ? [{ phone: customer.phone }] : []),
              ...(customer.email ? [{ email: customer.email }] : []),
            ],
          })
        : Promise.resolve(),
    ]);

    await Customer.findByIdAndDelete(customerId);

    res.json(formatSuccessResponse(null, 'Account deleted successfully'));
  } catch (error) {
    console.error('Error deleting customer account:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};
