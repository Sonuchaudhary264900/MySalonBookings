// controllers/auth/ownerAuthController.js
/*
  Owner Authentication Controller (OTP-only via Firebase phone auth)
  Handles:
  - Firebase register / login
  - Get / update current owner
  - Refresh token (with rotation)
  - Logout, delete account (session-authorized)
  - Active sessions: list / revoke
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
const { setAuthCookies, clearAuthCookies } = require('../../utils/cookies');

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
// DELETE ACCOUNT
// ===================================================
exports.deleteAccount = async (req, res) => {
  try {
    // OTP-only: deletion is authorized by the logged-in session (authenticateOwner),
    // not a password. Owners no longer have passwords.
    const owner = await Owner.findById(req.owner._id);
    if (!owner) {
      return res.status(404).json(
        formatErrorResponse('Account not found', 404)
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

    // name and email are optional at registration — collected during onboarding
    const errors = [];
    if (email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) errors.push('Valid email address required');
    if (errors.length > 0) {
      return res.status(400).json(
        formatErrorResponse(messages.GENERIC.VALIDATION_ERROR, 400, errors)
      );
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : null;

    // Verify Firebase token and extract phone number
    const { verifyFirebaseToken } = require('../../config/firebaseAdmin');
    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(firebaseToken);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('TOKEN_EXPIRED')) {
        return res.status(401).json(formatErrorResponse('OTP session expired. Please resend the code and try again.', 401));
      }
      return res.status(401).json(formatErrorResponse('Invalid or expired Firebase token. Please resend the OTP.', 401));
    }
    const phone = firebaseUser.phone;
    const regDigits = phone.replace(/\D/g, '');
    const regTen = regDigits.length >= 10 ? regDigits.slice(-10) : regDigits;

    // Check if owner already exists (phone variants; also check email only when provided)
    const regVariants = [phone, `+91${regTen}`, `91${regTen}`, regTen];
    const orClauses = [
      { phone: { $in: regVariants } },
      { phone: { $regex: regTen + '$' } },
    ];
    if (normalizedEmail) orClauses.push({ email: normalizedEmail });
    const existingOwner = await Owner.findOne({ $or: orClauses });

    if (existingOwner) {
      // Firebase already verified the phone — if email was NOT provided, this match is purely
      // by phone, so it's safe to auto-login regardless of stored phone format differences.
      // Only block with 409 when an email was explicitly provided and it belongs to a different phone.
      const phoneMatches = !existingOwner.phone ||
        existingOwner.phone === phone ||
        existingOwner.phone.replace(/\D/g,'').slice(-10) === regTen;

      if (!normalizedEmail || phoneMatches) {
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
        setAuthCookies(res, token, refreshToken);
        return res.status(200).json(
          formatSuccessResponse(
            { owner: existingOwner.getPublicProfile(), token, refreshToken },
            'Account already exists. Logged in successfully.',
            200
          )
        );
      }
      // Email was provided and belongs to a different phone — genuine conflict
      return res.status(409).json(
        formatErrorResponse('This email is already registered with a different account.', 409)
      );
    }

    // Create owner (passwordless — Firebase OTP is the authentication factor)
    const ownerData = {
      phone,
      phoneVerified: true,
      firebaseUid: firebaseUser.uid,
      ...(name && name.trim().length >= 2 ? { name: name.trim() } : {}),
      status: 'approved',
      approvalStatus: 'approved',
      isApproved: true,
      role: 'owner',
      subscription: {
        trialStartDate: new Date(),
        planType: 'free_trial',
        paymentStatus: 'trial',
        monthlyBookingCount: 0,
      },
    };
    if (normalizedEmail) ownerData.email = normalizedEmail;
    const owner = await Owner.create(ownerData);

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

    setAuthCookies(res, token, refreshToken);
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
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

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

    // Rotate the refresh token — invalidate the used one and issue a fresh one.
    const newRefreshToken = jwt.sign(
      { _id: owner._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    owner.refreshTokens = [
      ...owner.refreshTokens.filter((rt) => rt.token !== refreshToken).slice(-4),
      { token: newRefreshToken },
    ];
    await owner.save();

    // Generate new access token
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

    // Owner web reads the rotated refresh token from the cookie; mobile reads it
    // from the response body.
    setAuthCookies(res, newToken, newRefreshToken);
    res.json(
      formatSuccessResponse(
        { token: newToken, refreshToken: newRefreshToken },
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
// LOGOUT
// ===================================================
// ===================================================
// FIREBASE PHONE AUTH - LOGIN (OTP-based, no password)
// ===================================================
exports.firebaseLogin = async (req, res) => {
  // Verbose lookup tracing — dev/staging only (avoids leaking phone numbers to prod logs)
  const debugLog = process.env.NODE_ENV !== 'production' ? console.log : () => {};
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
    const firebaseUid = firebaseUser.uid;
    const digits = rawPhone.replace(/\D/g, '');
    const tenDigit = digits.length >= 10 ? digits.slice(-10) : digits;

    // Build every plausible stored format from Firebase phone + user-typed phone
    const variantSet = new Set([rawPhone, `+91${tenDigit}`, `91${tenDigit}`, tenDigit, `0${tenDigit}`]);
    if (clientPhone) {
      const cd = String(clientPhone).replace(/\D/g, '');
      const ct = cd.length >= 10 ? cd.slice(-10) : cd;
      [clientPhone.trim(), `+91${ct}`, `91${ct}`, ct, `0${ct}`].forEach(v => variantSet.add(v));
    }
    const phoneVariants = [...variantSet];
    debugLog(`[owner firebaseLogin] uid="${firebaseUid}" firebase="${rawPhone}" variants=${JSON.stringify(phoneVariants)}`);

    // 1. Lookup by Firebase UID (fastest — set on all future logins)
    let owner = await Owner.findOne({ firebaseUid }).select('+isBanned');
    if (owner) debugLog(`[owner firebaseLogin] found by firebaseUid: ${owner._id}`);

    // 2. Lookup by phone variants + regex
    if (!owner) {
      owner = await Owner.findOne({
        $or: [
          { phone: { $in: phoneVariants } },
          { phone: { $regex: tenDigit + '$' } },
        ],
      }).select('+isBanned');
      if (owner) debugLog(`[owner firebaseLogin] found by phone query: ${owner._id} stored="${owner.phone}"`);
    }

    // 3. Business phone fallback → resolve Owner via ownerId
    if (!owner) {
      const Business = require('../../models/Business');
      const business = await Business.findOne({
        $or: [
          { phone: { $in: phoneVariants } },
          { phone: { $regex: tenDigit + '$' } },
        ],
      }).select('ownerId phone');
      if (business?.ownerId) {
        owner = await Owner.findById(business.ownerId).select('+isBanned');
        if (owner) debugLog(`[owner firebaseLogin] found via business ${business._id}: ${owner._id}`);
      }
    }

    // 4. Brute-force JS scan — covers any stored type/format that defeats regex
    // (e.g. phone stored as Number, or with invisible chars).  Safe for small owner collections.
    if (!owner) {
      const allOwners = await Owner.find({}).select('+isBanned phone firebaseUid').lean();
      debugLog(`[owner firebaseLogin] brute-scan: ${allOwners.length} owners, tenDigit="${tenDigit}"`);
      const matched = allOwners.find(o => {
        if (!o.phone) return false;
        const d = String(o.phone).replace(/\D/g, '');
        return d.length >= 10 && d.slice(-10) === tenDigit;
      });
      if (matched) {
        owner = await Owner.findById(matched._id).select('+isBanned');
        debugLog(`[owner firebaseLogin] brute-scan match: ${owner._id} stored phone="${matched.phone}"`);
        // Heal the stored phone to E.164 so future regex lookups work
        try {
          await Owner.updateOne({ _id: owner._id }, { phone: rawPhone });
          owner.phone = rawPhone;
        } catch (healErr) {
          console.warn(`[owner firebaseLogin] phone heal failed: ${healErr.message}`);
        }
      }
    }

    if (!owner) {
      debugLog(`[owner firebaseLogin] NOT FOUND after all 4 fallbacks — firebase="${rawPhone}"`);
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
    // Persist Firebase UID so future logins find the account instantly
    if (!owner.firebaseUid) owner.firebaseUid = firebaseUid;
    await owner.save();

    setAuthCookies(res, token, refreshToken);
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
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

    const update = { expoPushToken: null };
    if (refreshToken) update.$pull = { refreshTokens: { token: refreshToken } };

    await Owner.findByIdAndUpdate(req.owner._id, update);

    clearAuthCookies(res);
    res.json(formatSuccessResponse(null, messages.AUTH.LOGOUT_SUCCESS));
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// LIST ACTIVE SESSIONS
// ===================================================
exports.getSessions = async (req, res) => {
  try {
    const owner = await Owner.findById(req.owner._id).select('refreshTokens');
    if (!owner) return res.status(404).json(formatErrorResponse('Owner not found', 404));

    const sessions = (owner.refreshTokens || []).map((rt) => ({
      id:          rt._id,
      deviceName:  rt.deviceName  || 'Unknown device',
      ip:          rt.ip          || null,
      userAgent:   rt.userAgent   || null,
      createdAt:   rt.createdAt,
      lastUsedAt:  rt.lastUsedAt  || rt.createdAt,
    }));

    res.json(formatSuccessResponse(sessions, 'Sessions retrieved'));
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};

// ===================================================
// REVOKE A SESSION
// ===================================================
exports.revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Owner.findByIdAndUpdate(req.owner._id, {
      $pull: { refreshTokens: { _id: sessionId } },
    });
    res.json(formatSuccessResponse(null, 'Session revoked'));
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json(formatErrorResponse(messages.GENERIC.ERROR, 500));
  }
};
