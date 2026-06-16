// controllers/auth/customerAuthController.js
/*
  Customer Authentication Controller (OTP-only via Firebase phone auth)
  Handles:
  - Firebase unified auth (login + register)
  - Firebase login
  - Get / update current customer
  - Refresh token (with rotation)
  - Logout, delete account
  - Forgot/set password (legacy, used only by the in-app "change password" screen)
*/

const Customer = require('../../models/Customer');
const OTP = require('../../models/OTP');
const jwt = require('jsonwebtoken');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');
const { referralCodeFromPhone } = require('../../utils/helpers');
const messages = require('../../utils/messages');


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
        referralCode: referralCodeFromPhone(phone),
      });
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

    customer.refreshTokens = [...(customer.refreshTokens || []).slice(-4), { token: refreshToken }];
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

    // Rotate the refresh token — invalidate the one just used and issue a fresh
    // one so a stolen/leaked refresh token has a short useful life.
    const newRefreshToken = jwt.sign(
      { _id: customer._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    customer.refreshTokens = [
      ...customer.refreshTokens.filter((rt) => rt.token !== refreshToken).slice(-4),
      { token: newRefreshToken },
    ];
    await customer.save();

    // Generate new access token
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
        { token: newToken, refreshToken: newRefreshToken },
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
