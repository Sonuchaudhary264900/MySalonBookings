import api from './api';

export const analyzePhoto = (imageUri, gender, lat, lng) => {
  const fd = new FormData();
  fd.append('image', { uri: imageUri, name: 'face.jpg', type: 'image/jpeg' });
  if (gender) fd.append('gender', gender);
  if (lat)    fd.append('lat', String(lat));
  if (lng)    fd.append('lng', String(lng));
  return api.post('/customer/hairstyle/recommend', fd, {
    headers: { 'X-Platform': 'mobile' },
    timeout: 30_000,
  });
};

export const getByShape  = (shape, gender) =>
  api.get(`/customer/hairstyle/by-shape?shape=${shape}&gender=${gender || 'unisex'}`, { headers: { 'X-Platform': 'mobile' } });

export const getTrending = (gender) =>
  api.get(`/customer/hairstyle/trending?gender=${gender || 'unisex'}&limit=10`, { headers: { 'X-Platform': 'mobile' } });

export const trackEvent  = (body) =>
  api.post('/customer/hairstyle/interact', body, { headers: { 'X-Platform': 'mobile' } }).catch(() => {});

export const getStylists = (body) =>
  api.post('/customer/hairstyle/stylist-match', body, { headers: { 'X-Platform': 'mobile' } });

export const getSaved    = () =>
  api.get('/customer/hairstyle/saved', { headers: { 'X-Platform': 'mobile' } });
