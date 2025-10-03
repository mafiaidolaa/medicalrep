"use client";

import * as React from 'react';
const { createContext, useContext, useEffect, useState } = React;

// Import theme IDs from premium-themes to ensure sync
type Theme = 'professional' | 'glassy' | 'dark' | 'orange-neon' | 'blue-sky' | 'ios-like' | 'emerald-garden' | 'royal-purple' | 'sunset-bliss' | 'ocean-deep';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: 'professional',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'professional',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [systemThemeLoaded, setSystemThemeLoaded] = useState(false);

  // Allowed themes for runtime validation - synced with premium-themes.ts
  const allowedThemes: Theme[] = [
    'professional',
    'glassy', 
    'dark',
    'orange-neon',
    'blue-sky',
    'ios-like',
    'emerald-garden',
    'royal-purple',
    'sunset-bliss',
    'ocean-deep'
  ];

  const sanitizeTheme = (value: string | null): Theme | null => {
    if (!value) return null;
    return (allowedThemes as string[]).includes(value) ? (value as Theme) : null;
  };

  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Quick local storage check first
        const rawStoredTheme = localStorage.getItem(storageKey);
        const storedTheme = sanitizeTheme(rawStoredTheme);
        if (storedTheme) {
          setTheme(storedTheme);
        } else if (rawStoredTheme) {
          // Clean up invalid stored value
          localStorage.removeItem(storageKey);
        }
        
        // Then check system theme (non-blocking)
        fetch('/api/system-settings/theme')
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('Failed to fetch system theme');
          })
          .then(({ defaultTheme: systemTheme, appliesSystemWide }) => {
            const safeSystemTheme = sanitizeTheme(systemTheme);
            if (appliesSystemWide && safeSystemTheme && safeSystemTheme !== theme) {
              setTheme(safeSystemTheme);
              localStorage.setItem(storageKey, safeSystemTheme);
            }
          })
          .catch(error => {
            console.warn('Failed to load system theme:', error);
          })
          .finally(() => {
            setSystemThemeLoaded(true);
          });
          
        // Mark as loaded immediately for local theme
        if (storedTheme) {
          setSystemThemeLoaded(true);
        }
        
      } catch (error) {
        console.warn('Theme loading error:', error);
        setSystemThemeLoaded(true);
      }
    };
    
    // Only run on mount
    if (!systemThemeLoaded) {
      loadTheme();
    }
  }, []); // Remove storageKey dependency to prevent re-runs

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove any previously applied theme-* classes to avoid accumulation
    Array.from(root.classList)
      .filter(cls => cls.startsWith('theme-'))
      .forEach(cls => root.classList.remove(cls));

    if (theme) {
      root.classList.add(`theme-${theme}`);
    }

    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);


  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
