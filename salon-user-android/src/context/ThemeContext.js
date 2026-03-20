import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@userTheme';

const LIGHT = {
  bg: '#f9fafb',
  card: '#fff',
  header: '#2563eb',
  text: '#111827',
  subText: '#6b7280',
  border: '#f3f4f6',
  input: '#f9fafb',
  inputBorder: '#d1d5db',
  placeholder: '#9ca3af',
};

const DARK = {
  bg: '#111827',
  card: '#1f2937',
  header: '#1e3a8a',
  text: '#f9fafb',
  subText: '#9ca3af',
  border: '#374151',
  input: '#374151',
  inputBorder: '#4b5563',
  placeholder: '#6b7280',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => { if (v === 'dark') setIsDark(true); });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDark, theme: isDark ? DARK : LIGHT, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
