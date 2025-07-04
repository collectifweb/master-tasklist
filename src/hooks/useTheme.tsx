import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: getAuthHeaders(),
        });
        
        if (response.ok) {
          const user = await response.json();
          const userTheme = user.displaymode as Theme;
          setTheme(userTheme);
          applyTheme(userTheme);
        } else {
          // Fallback to system preference if user not authenticated
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const fallbackTheme = systemPrefersDark ? 'dark' : 'light';
          setTheme(fallbackTheme);
          applyTheme(fallbackTheme);
        }
      } catch (error) {
        console.error('Failed to fetch user theme:', error);
        // Fallback to system preference on error
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const fallbackTheme = systemPrefersDark ? 'dark' : 'light';
        setTheme(fallbackTheme);
        applyTheme(fallbackTheme);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserTheme();
  }, [getAuthHeaders]);

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    
    if (newTheme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark');
    } else {
      html.removeAttribute('data-theme');
      html.classList.remove('dark');
    }
  };

  const updateThemeInDatabase = async (newTheme: Theme) => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displaymode: newTheme }),
      });

      if (!response.ok) {
        throw new Error('Failed to update theme in database');
      }
    } catch (error) {
      console.error('Failed to update theme in database:', error);
      // You might want to show a toast notification here
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    await updateThemeInDatabase(newTheme);
  };

  const setThemeMode = async (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    await updateThemeInDatabase(newTheme);
  };

  return {
    theme,
    toggleTheme,
    setTheme: setThemeMode,
    isDark: theme === 'dark',
    isLoading,
  };
}