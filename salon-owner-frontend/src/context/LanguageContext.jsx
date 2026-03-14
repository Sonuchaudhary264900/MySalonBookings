import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  en: {
    nav_dashboard:     'Dashboard',
    nav_services:      'Services',
    nav_bookings:      'Bookings',
    nav_analytics:     'Analytics',
    nav_profile:       'Profile',
    nav_notifications: 'Notifications',
    nav_settings:      'Settings',
    owner_panel:       'Owner Panel',
  },
  hi: {
    nav_dashboard:     'डैशबोर्ड',
    nav_services:      'सेवाएं',
    nav_bookings:      'बुकिंग',
    nav_analytics:     'विश्लेषण',
    nav_profile:       'प्रोफ़ाइल',
    nav_notifications: 'सूचनाएं',
    nav_settings:      'सेटिंग्स',
    owner_panel:       'ओनर पैनल',
  },
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('appPrefs') || '{}').language || 'en';
    } catch { return 'en'; }
  });

  const t = useCallback((key) => {
    return (translations[language] || translations.en)[key] || key;
  }, [language]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    document.documentElement.lang = lang;
  }, []);

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
