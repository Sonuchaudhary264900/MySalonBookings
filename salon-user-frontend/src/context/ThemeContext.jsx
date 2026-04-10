import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'salonUserTheme';

export const darkTheme = {
  bg: '#111827',
  card: '#111827',
  cardAlt: '#1f2937',
  text: '#ffffff',
  subText: '#9ca3af',
  border: '#1f2937',
  rowBorder: '#1f2937',
  input: '#1f2937',
  inputBorder: '#374151',
  placeholder: '#6b7280',
  accent: '#818cf8',
  navBtn: '#1f2937',
  navBtnBorder: '#374151',
};

export const lightTheme = {
  bg: '#F8FAFC',
  card: '#ffffff',
  cardAlt: '#F1F5F9',
  text: '#0F172A',
  subText: '#475569',
  border: '#CBD5E1',
  rowBorder: '#F1F5F9',
  input: '#F1F5F9',
  inputBorder: '#CBD5E1',
  placeholder: '#94A3B8',
  accent: '#6366f1',
  navBtn: '#ffffff',
  navBtnBorder: '#CBD5E1',
};

const ThemeContext = createContext({
  isDark: true,
  theme: darkTheme,
  toggleTheme: () => {},
});

function getSystemDark() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
  catch { return true; }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const manual = localStorage.getItem(STORAGE_KEY + 'Manual');
      if (!manual) {
        localStorage.removeItem(STORAGE_KEY);
        return getSystemDark();
      }
      return stored === 'dark';
    } catch { return getSystemDark(); }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const manual = localStorage.getItem(STORAGE_KEY + 'Manual');
      if (!manual) setIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      localStorage.setItem(STORAGE_KEY + 'Manual', '1');
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ isDark, theme: isDark ? darkTheme : lightTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
