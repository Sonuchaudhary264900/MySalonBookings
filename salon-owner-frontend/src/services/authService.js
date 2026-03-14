import api from './api';

const formatPhone = (phone) => {
  let p = String(phone).trim();
  if (!p.startsWith('+91')) {
    p = p.replace(/^(0|\+91|91)/, '');
    p = `+91${p}`;
  }
  if (!/^\+91[6-9]\d{9}$/.test(p)) throw new Error('Please enter a valid 10-digit Indian mobile number');
  return p;
};

// ── SEND OTP ────────────────────────────────────────────────────
export const sendOTP = async (phone) => {
  const formattedPhone = formatPhone(phone);
  const response = await api.post('/owner/auth/send-otp', { phone: formattedPhone });
  return { success: true, message: 'OTP sent to your phone', data: response.data };
};

// ── VERIFY OTP ──────────────────────────────────────────────────
export const verifyOTP = async (phone, otp) => {
  const formattedPhone = formatPhone(phone);
  const cleanOTP = String(otp).trim().replace(/\D/g, '');
  if (!/^\d{6}$/.test(cleanOTP)) throw new Error('Invalid OTP format');

  const response = await api.post('/owner/auth/verify-otp', { phone: formattedPhone, otp: cleanOTP });
  return { success: true, message: 'OTP verified', data: response.data };
};

// ── REGISTER ────────────────────────────────────────────────────
export const registerUser = async (userData) => {
  if (!userData.name?.trim())     throw new Error('Name is required');
  if (!userData.email?.trim())    throw new Error('Email is required');
  if (!userData.password?.trim()) throw new Error('Password is required');
  if (!userData.phone?.trim())    throw new Error('Phone is required');
  if (!userData.otp?.trim())      throw new Error('OTP is required');

  const formattedPhone = formatPhone(userData.phone);
  const response = await api.post('/owner/auth/register', {
    phone:    formattedPhone,
    otp:      userData.otp.trim(),
    name:     userData.name.trim(),
    email:    userData.email.trim().toLowerCase(),
    password: userData.password,
  });

  const responseData = response.data?.data || response.data;
  if (responseData.token) {
    localStorage.setItem('token', responseData.token);
    localStorage.setItem('user', JSON.stringify(responseData.owner || responseData));
  }
  return { success: true, message: 'Registration successful', data: response.data };
};

// ── LOGIN ───────────────────────────────────────────────────────
export const loginUser = async (phone, password) => {
  if (!password?.trim()) throw new Error('Password is required');
  const formattedPhone = formatPhone(phone);
  const response = await api.post('/owner/auth/login', {
    identifier: formattedPhone,
    password:   password.trim(),
  });

  const responseData = response.data?.data || response.data;
  if (responseData.token) {
    localStorage.setItem('token', responseData.token);
    localStorage.setItem('user', JSON.stringify(responseData.owner || responseData));
  }
  return { success: true, message: 'Login successful', data: response.data };
};

// ── GET CURRENT USER ────────────────────────────────────────────
export const getCurrentUser = async () => {
  const response = await api.get('/owner/auth/me');
  localStorage.setItem('user', JSON.stringify(response.data.data || response.data));
  return { success: true, data: response.data };
};

// ── UPDATE PROFILE ──────────────────────────────────────────────
export const updateProfile = async (userData) => {
  const response = await api.put('/owner/auth/me', userData);
  localStorage.setItem('user', JSON.stringify(response.data.data || response.data));
  return { success: true, message: 'Profile updated successfully', data: response.data };
};

// ── CHANGE PASSWORD ─────────────────────────────────────────────
export const changePassword = async (oldPassword, newPassword) => {
  if (!oldPassword?.trim()) throw new Error('Old password is required');
  if (!newPassword?.trim()) throw new Error('New password is required');
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const response = await api.post('/owner/auth/change-password', {
    currentPassword: oldPassword.trim(),
    newPassword: newPassword.trim(),
  });
  return { success: true, message: 'Password changed successfully', data: response.data };
};

// ── LOGOUT ──────────────────────────────────────────────────────
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return { success: true, message: 'Logged out successfully' };
};

// ── VERIFY EMAIL ────────────────────────────────────────────────
export const verifyEmail = async (email, otp) => {
  const response = await api.post('/owner/auth/verify-email', {
    email: email.trim().toLowerCase(),
    otp:   String(otp).trim(),
  });
  return { success: true, message: 'Email verified', data: response.data };
};
