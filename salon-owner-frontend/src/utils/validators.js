// ✅ PHONE VALIDATION
export const validatePhone = (phone) => {
  const cleanPhone = String(phone).replace(/[^\d]/g, '');
  if (cleanPhone.length !== 10 && cleanPhone.length !== 12) {
    return 'Phone number must be 10 digits';
  }
  return null;
};

// ✅ EMAIL VALIDATION
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return 'Email is required';
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
};

// ✅ SALON NAME VALIDATION
export const validateSalonName = (name) => {
  if (!name.trim()) return 'Salon name is required';
  if (name.trim().length < 3) return 'Salon name must be at least 3 characters';
  if (name.trim().length > 100) return 'Salon name must be less than 100 characters';
  return null;
};

// ✅ ADDRESS VALIDATION
export const validateAddress = (address) => {
  if (!address.trim()) return 'Address is required';
  if (address.trim().length < 5) return 'Address must be at least 5 characters';
  return null;
};

// ✅ CITY VALIDATION
export const validateCity = (city) => {
  if (!city.trim()) return 'City is required';
  if (city.trim().length < 2) return 'City name must be at least 2 characters';
  return null;
};

// ✅ PASSWORD VALIDATION
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
};

// ✅ NAME VALIDATION
export const validateName = (name) => {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 50) return 'Name must be less than 50 characters';
  return null;
};

// ✅ WORKING HOURS VALIDATION
export const validateWorkingHours = (open, close) => {
  if (!open || !close) return 'Opening and closing times are required';
  if (open >= close) return 'Opening time must be before closing time';
  return null;
};

// ✅ LOCATION VALIDATION
export const validateLocation = (location) => {
  if (!location || !location.lat || !location.lng) {
    return 'Please select a location on the map';
  }
  return null;
};

// ✅ SERVICE VALIDATION
export const validateService = (name, price, duration) => {
  const errors = {};
  
  if (!name.trim()) errors.name = 'Service name is required';
  if (!price || price <= 0) errors.price = 'Price must be greater than 0';
  if (!duration || duration <= 0) errors.duration = 'Duration must be greater than 0';
  
  return Object.keys(errors).length > 0 ? errors : null;
};
