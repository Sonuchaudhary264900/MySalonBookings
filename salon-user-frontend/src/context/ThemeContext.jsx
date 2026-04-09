import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'salonUserTheme';

export const darkTheme = {
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
  accent: '#818cf8',
  navBtn: '#1e293b',
  navBtnBorder: '#334155',
};

export const lightTheme = {
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
  accent: '#6366f1',
  navBtn: '#ffffff',
  navBtnBorder: '#e5e7eb',
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
