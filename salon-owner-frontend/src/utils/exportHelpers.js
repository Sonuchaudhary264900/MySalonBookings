/**
 * Export Helpers
 * 
 * Utilities for exporting data to CSV format
 */

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Create CSV header
  const csvHeaders = headers.join(',');

  // Create CSV rows
  const csvRows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      // Handle values with commas by wrapping in quotes
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value || '';
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
};

/**
 * Download CSV file
 */
export const downloadCSV = (csvContent, fileName) => {
  const element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
  );
  element.setAttribute('download', fileName);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

/**
 * Generate revenue report CSV
 */
export const generateRevenueReportCSV = (data) => {
  const headers = ['Date', 'Revenue', 'Bookings', 'Avg Amount'];
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, `revenue-report-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Generate bookings report CSV
 */
export const generateBookingsReportCSV = (data) => {
  const headers = ['Booking ID', 'Customer', 'Service', 'Date', 'Time', 'Status', 'Amount'];
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, `bookings-report-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Generate services report CSV
 */
export const generateServicesReportCSV = (data) => {
  const headers = ['Service', 'Bookings', 'Revenue', 'Avg Rating', 'Duration'];
  const csv = convertToCSV(data, headers);
  downloadCSV(csv, `services-report-${new Date().toISOString().split('T')[0]}.csv`);
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

/**
 * Format date for display — respects user's dateFormat + language preference
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
 * Format time string (HH:MM) — respects user's timeFormat preference
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