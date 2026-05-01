import { useState, useEffect } from 'react';
import api from '../services/api';

const _cache = {};

export function useCatalogImages(businessType) {
  const [adminCatalogMap, setAdminCatalogMap] = useState(
    _cache[businessType || '_all'] || null
  );

  useEffect(() => {
    const key = businessType || '_all';
    if (_cache[key]) { setAdminCatalogMap(_cache[key]); return; }
    const params = businessType ? { businessType } : {};
    api.get('/public/catalog-images', { params })
      .then(res => {
        const map = {
          categoryImages: res.data?.data?.categoryImages || {},
          serviceImages:  res.data?.data?.serviceImages  || {},
        };
        _cache[key] = map;
        setAdminCatalogMap(map);
      })
      .catch(() => {
        const empty = { categoryImages: {}, serviceImages: {} };
        _cache[key] = empty;
        setAdminCatalogMap(empty);
      });
  }, [businessType]);

  return adminCatalogMap;
}
