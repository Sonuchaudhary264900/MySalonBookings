import { useState, useEffect } from 'react';
import api from '../services/api';

// In-memory cache so we only fetch once per session per businessType
const _cache = {};

/**
 * Returns { categoryImages, serviceImages } fetched from /public/catalog-images.
 * Falls back to empty maps if the request fails.
 * categoryImages: { 'Hair Services': 'https://...', 'Beard & Shaving': '...', ... }
 * serviceImages:  { 'Haircut': 'https://...', ... }
 */
export function useCatalogImages(businessType) {
  const [adminCatalogMap, setAdminCatalogMap] = useState(
    _cache[businessType] || null
  );

  useEffect(() => {
    if (!businessType) return;
    if (_cache[businessType]) { setAdminCatalogMap(_cache[businessType]); return; }
    api.get('/public/catalog-images', { params: { businessType } })
      .then(res => {
        const map = {
          categoryImages:    res.data?.data?.categoryImages    || {},
          subCategoryImages: res.data?.data?.subCategoryImages || {},
          serviceImages:     res.data?.data?.serviceImages     || {},
        };
        _cache[businessType] = map;
        setAdminCatalogMap(map);
      })
      .catch(() => {
        const empty = { categoryImages: {}, subCategoryImages: {}, serviceImages: {} };
        _cache[businessType] = empty;
        setAdminCatalogMap(empty);
      });
  }, [businessType]);

  return adminCatalogMap;
}
