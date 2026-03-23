import api from './api';

// ── CREATE SALON ────────────────────────────────────────────────
export const createSalon = async (salonData) => {
  const isFormData = salonData instanceof FormData;
  const get = (key) => isFormData ? salonData.get(key) : salonData[key];

  const name     = get('name');
  const email    = get('email');
  const phone    = get('phone');
  const address  = get('address');
  const city     = get('city');
  const state    = get('state');
  const pincode  = get('pincode');
  const description      = get('description');
  const category         = get('category');
  const workingHours     = get('workingHours');
  const photos           = get('photos');
  const servedGender     = get('servedGender');
  const offeredCategories = get('offeredCategories');
  const kidsHaircut      = get('kidsHaircut');
  const atHomeServices   = get('atHomeServices');
  const locationData     = get('location');

  if (!name)    throw new Error('Salon name is required');
  if (!phone)   throw new Error('Phone is required');
  if (!address) throw new Error('Address is required');

  let normalizedPhone = String(phone).replace(/\D/g, '');
  if (normalizedPhone.length === 10) normalizedPhone = '91' + normalizedPhone;
  if (!normalizedPhone.startsWith('91')) normalizedPhone = '91' + normalizedPhone;
  normalizedPhone = '+' + normalizedPhone;

  const body = {
    name:    typeof name    === 'string' ? name.trim()    : name,
    phone:   normalizedPhone,
    address: typeof address === 'string' ? address.trim() : address,
  };
  if (email)       body.email       = typeof email === 'string' ? email.trim().toLowerCase() : email;
  if (city)        body.city        = typeof city  === 'string' ? city.trim()  : city;
  if (state)       body.state       = state;
  if (pincode)     body.pincode     = pincode;
  if (description) body.description = typeof description === 'string' ? description.trim() : description;
  if (category)    body.category    = category;
  if (workingHours) body.workingHours = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
  if (photos && photos.length > 0) body.photos = photos;
  if (servedGender) body.servedGender = servedGender;
  if (offeredCategories) body.offeredCategories = typeof offeredCategories === 'string' ? JSON.parse(offeredCategories) : offeredCategories;
  if (kidsHaircut !== undefined && kidsHaircut !== null) body.kidsHaircut = kidsHaircut;
  if (atHomeServices !== undefined && atHomeServices !== null) body.atHomeServices = atHomeServices;
  if (locationData) body.location = typeof locationData === 'string' ? JSON.parse(locationData) : locationData;

  const response = await api.post('/owner/salon', body);
  return { success: true, message: 'Salon created successfully', data: response.data.data };
};

// ── UPLOAD SALON PHOTOS ─────────────────────────────────────────
export const uploadSalonPhotos = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  const response = await api.post('/owner/salon/upload-photos', formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data.data?.urls || [];
};

// ── UPLOAD & SAVE SALON LOGO ─────────────────────────────────────
export const updateSalonLogo = async (file) => {
  const formData = new FormData();
  formData.append('photos', file);
  const uploadRes = await api.post('/owner/salon/upload-photos', formData, {
    headers: { 'Content-Type': undefined },
  });
  const url = uploadRes.data.data?.urls?.[0];
  if (!url) throw new Error('Upload failed');
  await api.put('/owner/salon/photos', { logo: url });
  return url;
};

// ── GET MY SALON ────────────────────────────────────────────────
export const getMySalon = async () => {
  const response = await api.get('/owner/salon');
  return { success: true, data: response.data.data };
};

// ── UPDATE SALON ────────────────────────────────────────────────
export const updateSalon = async (salonData) => {
  const body = {};
  if (salonData.name)         body.name         = salonData.name.trim();
  if (salonData.email)        body.email        = salonData.email.trim().toLowerCase();
  if (salonData.phone)        body.phone        = salonData.phone;
  if (salonData.address)      body.address      = salonData.address.trim();
  if (salonData.city)         body.city         = salonData.city.trim();
  if (salonData.state)        body.state        = salonData.state;
  if (salonData.pincode)      body.pincode      = salonData.pincode;
  if (salonData.description)  body.description  = salonData.description.trim();
  if (salonData.location)     body.location     = salonData.location;
  if (salonData.workingHours) body.workingHours = salonData.workingHours;
  if (salonData.advanceBookingDays !== undefined)   body.advanceBookingDays   = salonData.advanceBookingDays;
  if (salonData.bookingMode !== undefined)          body.bookingMode          = salonData.bookingMode;
  if (salonData.autoConfirmBookings !== undefined)  body.autoConfirmBookings  = salonData.autoConfirmBookings;
  if (salonData.servedGender)                       body.servedGender         = salonData.servedGender;
  if (Array.isArray(salonData.offeredCategories))   body.offeredCategories    = salonData.offeredCategories;
  if (salonData.kidsHaircut !== undefined)          body.kidsHaircut          = salonData.kidsHaircut;
  if (salonData.atHomeServices !== undefined)       body.atHomeServices       = salonData.atHomeServices;

  const response = await api.put('/owner/salon', body);
  return { success: true, message: 'Salon updated successfully', data: response.data.data };
};

// ── APPROVAL STATUS ─────────────────────────────────────────────
export const getSalonStatus = async () => {
  const response = await api.get('/owner/salon/approval-status');
  return { success: true, data: response.data.data };
};

// ── CREATE SERVICE ──────────────────────────────────────────────
export const createService = async (serviceData) => {
  const price = serviceData.basePrice ?? serviceData.price;
  if (!serviceData.name?.trim()) throw new Error('Service name is required');
  if (!price || price <= 0)      throw new Error('Valid price is required');
  if (!serviceData.duration || serviceData.duration <= 0) throw new Error('Valid duration is required');

  const response = await api.post('/owner/services', {
    name:        serviceData.name.trim(),
    description: serviceData.description?.trim(),
    category:    serviceData.category || 'haircut',
    basePrice:   parseFloat(price),
    duration:    parseInt(serviceData.duration),
  });
  return { success: true, message: 'Service created', data: response.data.data };
};

// ── GET SERVICES ────────────────────────────────────────────────
export const getServices = async () => {
  const response = await api.get('/owner/services');
  const payload  = response.data.data;
  return {
    success: true,
    data: Array.isArray(payload) ? payload : (payload?.services ?? []),
  };
};

// ── UPDATE SERVICE ──────────────────────────────────────────────
export const updateService = async (serviceId, serviceData) => {
  const price = serviceData.basePrice ?? serviceData.price;
  const response = await api.put(`/owner/services/${serviceId}`, {
    name:        serviceData.name?.trim(),
    description: serviceData.description?.trim(),
    category:    serviceData.category,
    basePrice:   price ? parseFloat(price) : undefined,
    duration:    serviceData.duration ? parseInt(serviceData.duration) : undefined,
  });
  return { success: true, message: 'Service updated', data: response.data.data };
};

// ── DELETE SERVICE ──────────────────────────────────────────────
export const deleteService = async (serviceId) => {
  const response = await api.delete(`/owner/services/${serviceId}`);
  return { success: true, message: 'Service deleted', data: response.data };
};

// ── GET BOOKINGS ────────────────────────────────────────────────
export const getBookings = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.date)   params.append('date',   filters.date);
  if (filters.page)   params.append('page',   filters.page);

  const response = await api.get(`/owner/bookings?${params.toString()}`);
  return { success: true, data: response.data.data?.bookings ?? [] };
};

// ── UPDATE BOOKING STATUS ───────────────────────────────────────
export const updateBookingStatus = async (bookingId, status) => {
  if (!['confirmed', 'completed', 'cancelled', 'in_progress'].includes(status)) {
    throw new Error('Invalid status');
  }
  const response = await api.put(`/owner/bookings/${bookingId}`, { status });
  return { success: true, message: 'Booking updated', data: response.data.data };
};

// ── CREATE WALK-IN BOOKING ──────────────────────────────────────
export const createWalkInBooking = async (data) => {
  const response = await api.post('/owner/bookings', data);
  return { success: true, data: response.data.data };
};

// ── GET BOOKED SLOTS (for walk-in modal) ────────────────────────
export const getBookedSlots = async (salonId, date, duration) => {
  const response = await api.get(`/public/salons/${salonId}/booked-slots?date=${date}&duration=${duration}`);
  return response.data.data || {};
};

// ── GET ANALYTICS ───────────────────────────────────────────────
export const getAnalytics = async () => {
  const response = await api.get('/owner/analytics/dashboard');
  return { success: true, data: response.data };
};

// ── GET REVENUE REPORT ──────────────────────────────────────────
export const getRevenueReport = async (startDate, endDate) => {
  const response = await api.get('/owner/reports/revenue', { params: { startDate, endDate } });
  return { success: true, data: response.data };
};

// ── GET CUSTOMER COUNT ──────────────────────────────────────────
export const getCustomerCount = async () => {
  const response = await api.get('/owner/customers/count');
  return { success: true, data: response.data };
};
