import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
  background: '#F7F1F4',
  backgroundAlt: '#F1E8ED',
  surface: '#FFF9FB',
  surfaceMuted: '#EBDDE4',
  surfaceStrong: '#DDCAD4',
  primary: '#B98298',
  primaryPressed: '#A56F86',
  primarySoft: '#E8CDD8',
  secondary: '#8798B2',
  secondarySoft: '#DCE3ED',
  text: '#382F38',
  textMuted: '#81747D',
  textSoft: '#A2979E',
  border: '#E3D5DC',
  success: '#789B8A',
  danger: '#B96F7E',
  white: '#FFFFFF',
  overlay: 'rgba(56, 47, 56, 0.42)',
};

export const darkColors = {
  background: '#120E15',
  backgroundAlt: '#1A141F',
  surface: '#201A24',
  surfaceMuted: '#2D2433',
  surfaceStrong: '#3E3147',
  primary: '#B98298',
  primaryPressed: '#A56F86',
  primarySoft: '#3E2A34',
  secondary: '#8798B2',
  secondarySoft: '#232A35',
  text: '#F5EFF2',
  textMuted: '#C5BAC0',
  textSoft: '#A59BA0',
  border: '#2E2533',
  success: '#8CB09E',
  danger: '#CC8A97',
  white: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

const ThemeContext = createContext({
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@chatz_theme_mode');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        } else {
          setIsDark(systemScheme === 'dark');
        }
      } catch (err) {
        console.error('Failed to load theme preference', err);
      } finally {
        setLoading(false);
      }
    };
    loadTheme();
  }, [systemScheme]);

  const toggleTheme = async () => {
    try {
      const nextMode = !isDark;
      setIsDark(nextMode);
      await AsyncStorage.setItem('@chatz_theme_mode', nextMode ? 'dark' : 'light');
    } catch (err) {
      console.error('Failed to save theme preference', err);
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeProvider;
