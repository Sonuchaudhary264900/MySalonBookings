import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

function getSystemTheme() {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  catch { return 'light'; }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Session-only override — cleared automatically when tab/browser closes
    const manual = sessionStorage.getItem('salon-theme-manual');
    if (!manual) return getSystemTheme();
    return sessionStorage.getItem('salon-theme') || getSystemTheme();
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Write to sessionStorage only (never localStorage — no forever persistence)
    if (sessionStorage.getItem('salon-theme-manual')) {
      sessionStorage.setItem('salon-theme', theme);
    }
  }, [theme]);

  // Follow system preference changes when user hasn't manually overridden this session
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const manual = sessionStorage.getItem('salon-theme-manual');
      if (!manual) setTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      // Mark as manually overridden for this session only
      sessionStorage.setItem('salon-theme-manual', '1');
      sessionStorage.setItem('salon-theme', next);
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
