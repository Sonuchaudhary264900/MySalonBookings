import { useCallback, useState } from 'react';
import { INDIAN_STATES, STATE_DISTRICTS } from '../constants/indianLocations';

function getComponent(components, type) {
  const c = components.find(c => c.types.includes(type));
  return c?.long_name || '';
}

function getShortComponent(components, type) {
  const c = components.find(c => c.types.includes(type));
  return c?.short_name || '';
}

function inferState(components) {
  const level1 = getComponent(components, 'administrative_area_level_1');
  return INDIAN_STATES.find(s => s.toLowerCase() === level1.toLowerCase()) || level1;
}

const DISTRICT_ALIASES = {
  // Punjab — official vs common names
  'sasnagar': 'Mohali', 'sahibzadaajitsinghnagar': 'Mohali',
  'nawanshahr': 'Shaheed Bhagat Singh Nagar', 'nawanshahar': 'Shaheed Bhagat Singh Nagar',
  'ropar': 'Rupnagar',
  // Haryana
  'gurgaon': 'Gurugram',
  // Karnataka
  'bangaloreurban': 'Bengaluru Urban', 'bangalorerural': 'Bengaluru Rural',
  'bangalore': 'Bengaluru Urban',
  // Uttar Pradesh
  'gautambuddhnagar': 'Gautam Buddha Nagar',
  'allahabad': 'Prayagraj', 'faizabad': 'Ayodhya',
  // Madhya Pradesh
  'narmadapuram': 'Hoshangabad',
  // West Bengal
  'north24parganas': 'North 24 Parganas', 'south24parganas': 'South 24 Parganas',
  'north24parganasdistrict': 'North 24 Parganas',
};

/** Match a single raw string against STATE_DISTRICTS list; returns '' if no match */
function matchDistrict(raw, list) {
  if (!raw || !list) return '';
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n = norm(raw);
  // Alias lookup
  if (DISTRICT_ALIASES[n] && list.includes(DISTRICT_ALIASES[n])) return DISTRICT_ALIASES[n];
  // Exact normalized match
  const exact = list.find(d => norm(d) === n);
  if (exact) return exact;
  // One contains the other
  const partial = list.find(d => { const nd = norm(d); return nd.includes(n) || n.includes(nd); });
  if (partial) return partial;
  // Word-by-word: each significant word in raw vs each word in district names
  const words = raw.toLowerCase().split(/\s+/).filter(w => w.length >= 4).map(norm);
  for (const w of words) {
    const wm = list.find(d => {
      const dWords = d.toLowerCase().split(/\s+/).map(norm);
      return dWords.some(dw => dw.startsWith(w) || w.startsWith(dw));
    });
    if (wm) return wm;
  }
  return '';
}

/**
 * Try admin_level_2 first; if it doesn't match a known district, try level_3.
 * Google sometimes puts the tehsil at level_2 and the district at level_3.
 */
function inferDistrict(level2, level3, state) {
  const list = STATE_DISTRICTS[state];
  if (!list) return '';
  return matchDistrict(level2, list) || matchDistrict(level3, list);
}

/**
 * Reverse-geocodes a lat/lng using the Google Geocoder API.
 * Returns { address, city, district, state, pincode }.
 * Requires google.maps to be loaded.
 */
export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);

  const geocode = useCallback(async (lat, lng) => {
    if (!window.google?.maps) return null;
    setLoading(true);
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        setLoading(false);
        if (status !== 'OK' || !results?.[0]) { resolve(null); return; }
        const c = results[0].address_components;

        const premise  = getComponent(c, 'premise');
        const route    = getComponent(c, 'route');
        const sub      = getComponent(c, 'sublocality_level_1') || getComponent(c, 'sublocality');
        const locality = getComponent(c, 'locality');
        const city     = locality;

        const level2   = getComponent(c, 'administrative_area_level_2');
        const level3   = getComponent(c, 'administrative_area_level_3');
        const state    = inferState(c);
        // Try level_2 first; if it's a tehsil name that doesn't match, fall through to level_3
        const district = inferDistrict(level2, level3, state);
        const pincode  = getShortComponent(c, 'postal_code');

        // Street address excludes city to avoid duplication in the city field
        const streetParts = [premise, route, sub].filter(Boolean);
        const address = streetParts.length
          ? streetParts.join(', ')
          : results[0].formatted_address.split(',').slice(0, -3).join(',').trim()
            || results[0].formatted_address;

        resolve({ address, city, district, state, pincode });
      });
    });
  }, []);

  return { geocode, loading };
}

export { INDIAN_STATES } from '../constants/indianLocations';
