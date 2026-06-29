export const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};

const BUSINESS_TYPE_SLUG = {
  barbershop:    'barbershop',
  salon:         'salon',
  spa_wellness:  'spa-wellness',
  makeup_bridal: 'makeup-bridal',
  skin_derma:    'skin-derma',
};

export const salonBookingUrl = (salon) => {
  if (!salon?._id) return 'https://glowloox.com';
  const slug = BUSINESS_TYPE_SLUG[salon.businessType] || 'salon';
  return `https://glowloox.com/${slug}/${salon._id}`;
};

export const STATUS_COLORS = {
  confirmed:   { bg: '#dcfce7', text: '#16a34a' },
  pending:     { bg: '#fef9c3', text: '#ca8a04' },
  completed:   { bg: '#e0e7ff', text: '#6366f1' },
  cancelled:   { bg: '#fee2e2', text: '#dc2626' },
  in_progress: { bg: '#f3e8ff', text: '#9333ea' },
};
