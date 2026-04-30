import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_PREFS_KEY = '@userAppPrefs';

// Maps display name ↔ language code
export const LANGUAGE_OPTIONS = [
  { name: 'English',  code: 'en' },
  { name: 'हिंदी',     code: 'hi' },
  { name: 'தமிழ்',    code: 'ta' },
  { name: 'తెలుగు',   code: 'te' },
  { name: 'ಕನ್ನಡ',    code: 'kn' },
  { name: 'বাংলা',    code: 'bn' },
];

const translations = {
  en: {
    appName: 'My Salon Bookings',
    customerApp: 'Customer App',
    // Bottom tabs
    tabHome: 'Home',
    tabStyleAI: 'StyleAI',
    tabBookings: 'Bookings',
    tabFavorites: 'Favorites',
    tabSettings: 'Settings',
    // Drawer
    navHome: 'Home',
    navBookings: 'Bookings',
    navFavorites: 'Favorites',
    navNotifications: 'Notifications',
    navSettings: 'Settings',
    logout: 'Logout',
    // HomeScreen
    homeTitle: 'My Salon Bookings',
    homeSubNearby: 'Find salons near you',
    homeSubLocDenied: 'Enable location for nearby salons',
    searchPlaceholder: 'Search salons, services...',
    catAll: 'All',
    catBarber: 'Men\'s Salon',
    catHairSalon: 'Hair Salon',
    catSpa: 'Spa',
    catMassage: 'Massage',
    catOther: 'Other',
    sortNearest: 'Nearest',
    sortMostBooked: 'Most Booked',
    sortTopRated: 'Top Rated',
    noSalonsNearby: 'No salons found nearby',
    enableLocation: 'Enable Location',
    // Bookings
    myBookings: 'My Bookings',
    filterAll: 'All',
    filterUpcoming: 'Upcoming',
    filterCompleted: 'Completed',
    filterCancelled: 'Cancelled',
    noBookingsYet: 'No bookings yet',
    // Favorites
    myFavorites: 'Favorites',
    noFavoritesYet: 'No favorites yet',
    // Settings
    settings: 'Settings',
    managePreferences: 'Manage your preferences',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    darkEnabled: 'Dark theme enabled',
    lightEnabled: 'Light theme enabled',
    notifications: 'Notifications',
    bookingReminders: 'Booking Reminders',
    bookingConfirmations: 'Booking Confirmations',
    cancellationAlerts: 'Cancellation Alerts',
    offersPromotions: 'Offers & Promotions',
    appPreferences: 'App Preferences',
    language: 'Language',
    timeFormat: 'Time Format',
    dateFormat: 'Date Format',
    privacySecurity: 'Privacy & Security',
    deleteAccount: 'Delete Account',
    signOut: 'Sign Out',
  },
  hi: {
    appName: 'My Salon Bookings',
    customerApp: 'ग्राहक ऐप',
    tabHome: 'होम',
    tabStyleAI: 'StyleAI',
    tabBookings: 'बुकिंग्स',
    tabFavorites: 'पसंदीदा',
    tabSettings: 'सेटिंग्स',
    navHome: 'होम',
    navBookings: 'बुकिंग्स',
    navFavorites: 'पसंदीदा',
    navNotifications: 'सूचनाएं',
    navSettings: 'सेटिंग्स',
    logout: 'लॉगआउट',
    homeTitle: 'My Salon Bookings',
    homeSubNearby: 'पास के सैलून खोजें',
    homeSubLocDenied: 'नजदीकी सैलून के लिए स्थान सक्षम करें',
    searchPlaceholder: 'सैलून, सेवाएं खोजें...',
    catAll: 'सभी',
    catBarber: 'पुरुष सैलून',
    catHairSalon: 'हेयर सैलून',
    catSpa: 'स्पा',
    catMassage: 'मसाज',
    catOther: 'अन्य',
    sortNearest: 'सबसे पास',
    sortMostBooked: 'सबसे ज्यादा बुक',
    sortTopRated: 'टॉप रेटेड',
    noSalonsNearby: 'पास में कोई सैलून नहीं मिला',
    enableLocation: 'स्थान सक्षम करें',
    myBookings: 'मेरी बुकिंग्स',
    filterAll: 'सभी',
    filterUpcoming: 'आगामी',
    filterCompleted: 'पूर्ण',
    filterCancelled: 'रद्द',
    noBookingsYet: 'अभी तक कोई बुकिंग नहीं',
    myFavorites: 'पसंदीदा',
    noFavoritesYet: 'अभी तक कोई पसंदीदा नहीं',
    settings: 'सेटिंग्स',
    managePreferences: 'अपनी प्राथमिकताएं प्रबंधित करें',
    appearance: 'रंग-रूप',
    darkMode: 'डार्क मोड',
    darkEnabled: 'डार्क थीम सक्रिय',
    lightEnabled: 'लाइट थीम सक्रिय',
    notifications: 'सूचनाएं',
    bookingReminders: 'बुकिंग रिमाइंडर',
    bookingConfirmations: 'बुकिंग पुष्टि',
    cancellationAlerts: 'रद्दीकरण अलर्ट',
    offersPromotions: 'ऑफर और प्रमोशन',
    appPreferences: 'ऐप प्राथमिकताएं',
    language: 'भाषा',
    timeFormat: 'समय प्रारूप',
    dateFormat: 'दिनांक प्रारूप',
    privacySecurity: 'गोपनीयता और सुरक्षा',
    deleteAccount: 'खाता हटाएं',
    signOut: 'साइन आउट',
  },
  // Tamil, Telugu, Kannada, Bengali fall back to English
  ta: null,
  te: null,
  kn: null,
  bn: null,
};

const LanguageContext = createContext({
  language: 'en',
  languageName: 'English',
  setLanguageByCode: () => {},
  setLanguageByName: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(APP_PREFS_KEY).then((val) => {
      if (val) {
        try {
          const p = JSON.parse(val);
          if (p.languageCode) {
            setLanguageState(p.languageCode);
          } else if (p.language) {
            // legacy: map old string name to code
            const opt = LANGUAGE_OPTIONS.find(o => o.name === p.language);
            if (opt) setLanguageState(opt.code);
          }
        } catch { /* silent */ }
      }
    });
  }, []);

  const persist = async (code) => {
    try {
      const existing = await AsyncStorage.getItem(APP_PREFS_KEY);
      const prefs = existing ? JSON.parse(existing) : {};
      const opt = LANGUAGE_OPTIONS.find(o => o.code === code);
      await AsyncStorage.setItem(APP_PREFS_KEY, JSON.stringify({
        ...prefs,
        languageCode: code,
        language: opt?.name || 'English',
      }));
    } catch { /* silent */ }
  };

  const setLanguageByCode = async (code) => {
    setLanguageState(code);
    await persist(code);
  };

  const setLanguageByName = async (name) => {
    const opt = LANGUAGE_OPTIONS.find(o => o.name === name);
    const code = opt?.code || 'en';
    setLanguageState(code);
    await persist(code);
  };

  const languageName = LANGUAGE_OPTIONS.find(o => o.code === language)?.name || 'English';

  const t = (key) => {
    const dict = translations[language];
    if (dict) return dict[key] ?? translations.en[key] ?? key;
    return translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, languageName, setLanguageByCode, setLanguageByName, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
