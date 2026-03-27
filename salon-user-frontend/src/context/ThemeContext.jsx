import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

function getSystemDark() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; }
  catch { return false; }
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('salonUserTheme');
      const userManuallySet = localStorage.getItem('salonUserThemeManual');
      // If no manual override recorded, always use system default
      if (!userManuallySet) {
        localStorage.removeItem('salonUserTheme');
        return getSystemDark();
      }
      return stored === 'dark';
    } catch { return getSystemDark(); }
  });

  // Apply class on every change
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Follow system preference changes when user hasn't manually overridden
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const manual = localStorage.getItem('salonUserThemeManual');
      if (!manual) setIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem('salonUserTheme', next ? 'dark' : 'light');
      localStorage.setItem('salonUserThemeManual', '1');
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
