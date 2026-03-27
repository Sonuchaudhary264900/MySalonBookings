const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');
const { formatSuccessResponse, formatErrorResponse } = require('../../utils/formatters');

// POST /admin/auth/login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(formatErrorResponse('Email and password are required', 400));
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin || !admin.isActive) {
      return res.status(401).json(formatErrorResponse('Invalid credentials', 401));
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json(formatErrorResponse('Invalid credentials', 401));
    }
    admin.lastLogin = new Date();
    admin.loginCount = (admin.loginCount || 0) + 1;
    await admin.save();
    const token = jwt.sign(
      { id: admin._id, role: 'admin', email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
    res.json(formatSuccessResponse({
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      token
    }, 'Login successful'));
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// GET /admin/auth/me
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) return res.status(404).json(formatErrorResponse('Admin not found', 404));
    res.json(formatSuccessResponse({ admin }, 'Success'));
  } catch (error) {
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

// POST /admin/auth/setup — create first admin (only if none exists)
const setupAdmin = async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    if (count > 0) {
      return res.status(403).json(formatErrorResponse('Admin already exists', 403));
    }
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json(formatErrorResponse('name, email, password required', 400));
    }
    const hashed = await bcrypt.hash(password, 12);
    const admin = await Admin.create({ name, email: email.toLowerCase(), password: hashed, role: 'super_admin' });
    res.json(formatSuccessResponse({ admin: { _id: admin._id, name: admin.name, email: admin.email } }, 'Admin created'));
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json(formatErrorResponse('Server error', 500));
  }
};

module.exports = { loginAdmin, getMe, setupAdmin };
