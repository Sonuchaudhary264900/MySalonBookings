import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_PREFS_KEY = '@appPrefs';

const translations = {
  en: {
    // App
    appName: 'GlowLoox',
    ownerPanel: 'Owner Panel',
    // Bottom tabs
    tabDashboard: 'Dashboard',
    tabAnalytics: 'Analytics',
    tabProfile: 'Profile',
    tabSettings: 'Settings',
    // Drawer nav
    navBookings: 'Bookings',
    navServices: 'Services',
    navCustomers: 'Customers',
    navCalendar: 'Calendar',
    navWorkingHours: 'Working Hours',
    navWalkIn: 'Walk-in',
    navGallery: 'Gallery',
    navCoupons: 'Coupons',
    navBilling: 'Billing & Plan',
    navReviews: 'Reviews',
    navNotifications: 'Notifications',
    logout: 'Logout',
    // HomeScreen
    dashboard: 'Dashboard',
    dashSubtitle: "Welcome back! Here's your salon's performance",
    addWalkIn: 'Add Walk-in',
    upcomingBookings: 'Upcoming Bookings',
    allClear: 'All clear!',
    noUpcomingBookings: 'No upcoming bookings for today or tomorrow',
    bookings: 'Bookings',
    noBookingsDate: 'No bookings on this date',
    today: 'Today',
    // Common
    refresh: 'Refresh',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    saveChanges: 'Save Changes',
    // Settings sections
    salonInformation: 'Salon Information',
    salonInfoSub: 'Name, category, contact & address',
    workingHours: 'Working Hours',
    workingHoursSub: 'Open/close times and working days',
    notifications: 'Notifications',
    notificationsSub: 'Email, SMS and alert preferences',
    appPreferences: 'App Preferences',
    appPrefSub: 'Language, time and date formats',
    bookingWindow: 'Booking Window',
    bookingWindowSub: 'How far ahead customers can book',
    bookingMode: 'Booking Mode',
    bookingModeSub: 'Flexible or sequential slot assignment',
    autoConfirm: 'Auto-Confirm Bookings',
    autoConfirmSub: 'Automatically confirm new bookings',
    salonPhotos: 'Salon Photos',
    salonPhotosSub: 'Upload photos to showcase your salon',
    closedDates: 'Closed Dates',
    closedDatesSub: 'Block specific dates from bookings',
    privacySecurity: 'Privacy & Security',
    privacySecuritySub: 'Data protection and account deletion',
    // App preferences labels
    language: 'Language',
    timeFormat: 'Time Format',
    dateFormat: 'Date Format',
    savePreferences: 'Save Preferences',
    // Status
    completed: 'Completed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    confirmed: 'Confirmed',
    inProgress: 'In Progress',
  },
  hi: {
    // App
    appName: 'GlowLoox',
    ownerPanel: 'मालिक पैनल',
    // Bottom tabs
    tabDashboard: 'डैशबोर्ड',
    tabAnalytics: 'विश्लेषण',
    tabProfile: 'प्रोफ़ाइल',
    tabSettings: 'सेटिंग्स',
    // Drawer nav
    navBookings: 'बुकिंग्स',
    navServices: 'सेवाएं',
    navCustomers: 'ग्राहक',
    navCalendar: 'कैलेंडर',
    navWorkingHours: 'काम के घंटे',
    navWalkIn: 'वॉक-इन',
    navGallery: 'गैलरी',
    navCoupons: 'कूपन',
    navBilling: 'बिलिंग और प्लान',
    navReviews: 'समीक्षाएं',
    navNotifications: 'सूचनाएं',
    logout: 'लॉगआउट',
    // HomeScreen
    dashboard: 'डैशबोर्ड',
    dashSubtitle: 'वापस आपका स्वागत है! आपके सैलून का प्रदर्शन',
    addWalkIn: 'वॉक-इन जोड़ें',
    upcomingBookings: 'आगामी बुकिंग',
    allClear: 'सब ठीक है!',
    noUpcomingBookings: 'आज या कल कोई आगामी बुकिंग नहीं',
    bookings: 'बुकिंग्स',
    noBookingsDate: 'इस तारीख पर कोई बुकिंग नहीं',
    today: 'आज',
    // Common
    refresh: 'ताज़ा करें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    saveChanges: 'बदलाव सहेजें',
    // Settings sections
    salonInformation: 'सैलून जानकारी',
    salonInfoSub: 'नाम, श्रेणी, संपर्क और पता',
    workingHours: 'काम के घंटे',
    workingHoursSub: 'खुलने/बंद होने का समय और कार्यदिवस',
    notifications: 'सूचनाएं',
    notificationsSub: 'ईमेल, SMS और अलर्ट प्राथमिकताएं',
    appPreferences: 'ऐप प्राथमिकताएं',
    appPrefSub: 'भाषा, समय और दिनांक प्रारूप',
    bookingWindow: 'बुकिंग विंडो',
    bookingWindowSub: 'ग्राहक कितने दिन आगे बुक कर सकते हैं',
    bookingMode: 'बुकिंग मोड',
    bookingModeSub: 'लचीला या क्रमिक स्लॉट असाइनमेंट',
    autoConfirm: 'स्वचालित बुकिंग पुष्टि',
    autoConfirmSub: 'नई बुकिंग स्वचालित रूप से पुष्ट करें',
    salonPhotos: 'सैलून फ़ोटो',
    salonPhotosSub: 'अपने सैलून की फ़ोटो अपलोड करें',
    closedDates: 'बंद तारीखें',
    closedDatesSub: 'विशिष्ट तारीखों पर बुकिंग ब्लॉक करें',
    privacySecurity: 'गोपनीयता और सुरक्षा',
    privacySecuritySub: 'डेटा सुरक्षा और खाता हटाना',
    // App preferences labels
    language: 'भाषा',
    timeFormat: 'समय प्रारूप',
    dateFormat: 'दिनांक प्रारूप',
    savePreferences: 'प्राथमिकताएं सहेजें',
    // Status
    completed: 'पूर्ण',
    pending: 'लंबित',
    cancelled: 'रद्द',
    confirmed: 'पुष्ट',
    inProgress: 'प्रगति में',
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(APP_PREFS_KEY).then((val) => {
      if (val) {
        try {
          const p = JSON.parse(val);
          if (p.language) setLanguageState(p.language);
        } catch { /* silent */ }
      }
    });
  }, []);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    try {
      const existing = await AsyncStorage.getItem(APP_PREFS_KEY);
      const prefs = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(APP_PREFS_KEY, JSON.stringify({ ...prefs, language: lang }));
    } catch { /* silent */ }
  };

  const t = (key) => translations[language]?.[key] ?? translations.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
