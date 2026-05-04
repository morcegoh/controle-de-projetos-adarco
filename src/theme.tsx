import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeType = 'light' | 'dark';

export const colors = {
  light: {
    background: '#F0FDF4',
    card: '#FFFFFF',
    textMain: '#002A15',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    primary: '#10B981',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
    warning: '#F59E0B',
    success: '#10B981',
    timelineBg: '#F1F5F9',
    headerBg: 'rgba(255, 255, 255, 0.8)',
    tabBg: 'rgba(255, 255, 255, 0.7)',
    tabActive: '#FFFFFF',
    inputBg: '#FFFFFF',
    tableHeaderRow: '#F8FAFC',
    tableBorder: '#E2E8F0',
    kanbanColumnBg: '#F8FAFC',
    kanbanCardHover: '#F1F5F9',
    glassBorder: 'rgba(255, 255, 255, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.05)',
  },
  dark: {
    background: '#000000',
    card: '#0A1A10',
    textMain: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    border: '#1B2F23',
    primary: '#34D399',
    danger: '#EF4444',
    dangerBg: '#450a0a',
    warning: '#F59E0B',
    success: '#34D399',
    timelineBg: '#030805',
    headerBg: 'rgba(10, 26, 16, 0.8)',
    tabBg: 'rgba(10, 26, 16, 0.7)',
    tabActive: '#0A1A10',
    inputBg: '#030805',
    tableHeaderRow: '#030805',
    tableBorder: '#1B2F23',
    kanbanColumnBg: '#030805',
    kanbanCardHover: '#1B2F23',
    glassBorder: 'rgba(52, 211, 153, 0.2)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  }
};

type ThemeContextType = {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: typeof colors.light;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  colors: colors.light,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as ThemeType;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('app-theme', newTheme);
      
      // Update HTML root class for global CSS if needed
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: colors[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};
