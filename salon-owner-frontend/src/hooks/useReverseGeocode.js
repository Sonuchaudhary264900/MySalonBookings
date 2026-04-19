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

/** Match geocoded district string against STATE_DISTRICTS list; returns '' if no match */
function inferDistrict(rawDistrict, state) {
  const list = STATE_DISTRICTS[state];
  if (!list || !rawDistrict) return '';
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const raw = norm(rawDistrict);
  // Exact normalized match
  const exact = list.find(d => norm(d) === raw);
  if (exact) return exact;
  // One contains the other (handles extra words like "Urban", "Rural")
  const partial = list.find(d => {
    const nd = norm(d);
    return nd.includes(raw) || raw.includes(nd);
  });
  if (partial) return partial;
  // First significant word match (e.g. Google "Gurugram District" → our "Gurugram")
  const firstWord = rawDistrict.toLowerCase().split(/\s+/)[0];
  if (firstWord.length > 3) {
    const wordMatch = list.find(d => d.toLowerCase().startsWith(firstWord));
    if (wordMatch) return wordMatch;
  }
  return '';
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

        // level_2 is the district in India; level_3 is taluk/tehsil (too granular)
        const rawDistrict = getComponent(c, 'administrative_area_level_2')
                         || getComponent(c, 'administrative_area_level_3');
        const state    = inferState(c);
        const district = inferDistrict(rawDistrict, state);
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
