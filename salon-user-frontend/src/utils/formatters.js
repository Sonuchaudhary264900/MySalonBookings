/**
 * Format a date string/object respecting user's dateFormat preference
 */
export const formatDate = (date) => {
  try {
    const prefs = JSON.parse(localStorage.getItem('appPrefs') || '{}');
    const fmt = prefs.dateFormat || 'DD/MM/YYYY';
    const d = new Date(date);
    if (isNaN(d)) return String(date);
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

/**
 * Format a time string "HH:MM" respecting user's timeFormat preference
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  try {
    const prefs = JSON.parse(localStorage.getItem('appPrefs') || '{}');
    const fmt = prefs.timeFormat || '12h';
    const [h, m] = timeStr.split(':').map(Number);
    if (fmt === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch {
    return timeStr;
  }
};
