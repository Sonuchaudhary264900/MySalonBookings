import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@userTheme';

const LIGHT = {
  bg: '#f9fafb',
  card: '#ffffff',
  cardAlt: '#f3f4f6',
  text: '#111827',
  subText: '#6b7280',
  border: '#e5e7eb',
  rowBorder: '#f3f4f6',
  input: '#ffffff',
  inputBorder: '#d1d5db',
  placeholder: '#9ca3af',
  accent: '#2563eb',
  header: '#2563eb',
};

const DARK = {
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#162032',
  text: '#f1f5f9',
  subText: '#94a3b8',
  border: '#334155',
  rowBorder: '#1e293b',
  input: '#1e293b',
  inputBorder: '#475569',
  placeholder: '#64748b',
  accent: '#3b82f6',
  header: '#1e3a8a',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => { if (v === 'light') setIsDark(false); });
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
