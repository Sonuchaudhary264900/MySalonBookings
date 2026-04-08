import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('admin_theme') !== 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('admin_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeContext.Provider>;
}
