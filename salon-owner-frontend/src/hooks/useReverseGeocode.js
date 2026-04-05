import { useCallback, useState } from 'react';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

/** Returns the best match for an address component of a given type */
function getComponent(components, type) {
  const c = components.find(c => c.types.includes(type));
  return c?.long_name || '';
}

function getShortComponent(components, type) {
  const c = components.find(c => c.types.includes(type));
  return c?.short_name || '';
}

/** Nearest Indian state from geocode result */
function inferState(components) {
  const level1 = getComponent(components, 'administrative_area_level_1');
  // Find closest match
  return INDIAN_STATES.find(s => s.toLowerCase() === level1.toLowerCase()) || level1;
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

        const sub        = getComponent(c, 'sublocality_level_1') || getComponent(c, 'sublocality');
        const premise    = getComponent(c, 'premise');
        const route      = getComponent(c, 'route');
        const locality   = getComponent(c, 'locality');
        const district   = getComponent(c, 'administrative_area_level_3')
                        || getComponent(c, 'administrative_area_level_2')
                        || locality;
        const city       = locality || district;
        const state      = inferState(c);
        const pincode    = getShortComponent(c, 'postal_code');

        const parts = [premise, route, sub, locality].filter(Boolean);
        const address = parts.join(', ') || results[0].formatted_address;

        resolve({ address, city, district, state, pincode });
      });
    });
  }, []);

  return { geocode, loading };
}

export { INDIAN_STATES };
