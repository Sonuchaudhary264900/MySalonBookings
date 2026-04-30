import api from './api';

export const analyzePhoto = (blob, gender, lat, lng) => {
  const fd = new FormData();
  fd.append('image', blob, 'face.jpg');
  if (gender) fd.append('gender', gender);
  if (lat)    fd.append('lat', String(lat));
  if (lng)    fd.append('lng', String(lng));
  return api.post('/customer/hairstyle/recommend', fd, {
    headers:  { 'Content-Type': 'multipart/form-data' },
    timeout:  30_000,
  });
};

export const getByShape      = (shape, gender) => api.get(`/customer/hairstyle/by-shape?shape=${shape}&gender=${gender || 'unisex'}`);
export const getTrending     = (gender, limit) => api.get(`/customer/hairstyle/trending?gender=${gender || 'unisex'}&limit=${limit || 10}`);
export const trackEvent      = (body)           => api.post('/customer/hairstyle/interact', body).catch(() => {});
export const getStylistMatch = (body)           => api.post('/customer/hairstyle/stylist-match', body);
export const getSaved        = ()               => api.get('/customer/hairstyle/saved');
