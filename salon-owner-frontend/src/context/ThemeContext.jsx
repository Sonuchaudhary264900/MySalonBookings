import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

function getSystemTheme() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch { return 'light'; }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const manual = localStorage.getItem('salon-theme-manual');
    if (!manual) return getSystemTheme();
    return localStorage.getItem('salon-theme') || getSystemTheme();
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    if (localStorage.getItem('salon-theme-manual')) {
      localStorage.setItem('salon-theme', theme);
    }
  }, [theme]);

  // Follow system preference changes when user hasn't manually overridden
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const manual = localStorage.getItem('salon-theme-manual');
      if (!manual) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('salon-theme-manual', '1');
      localStorage.setItem('salon-theme', next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
