import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

export type Theme = 'light' | 'dark';

const publicRoutes = ['/login', '/signup', '/error', '/403'];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);
  const { getAuthHeaders, user, initializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchUserTheme = async () => {
      try {
        // Sur les routes publiques, utiliser la préférence système
        if (publicRoutes.includes(router.pathname)) {
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const fallbackTheme = systemPrefersDark ? 'dark' : 'light';
          setTheme(fallbackTheme);
          applyTheme(fallbackTheme);
          setIsLoading(false);
          return;
        }

        // Ne faire l'appel API que si l'utilisateur est connecté
        if (!initializing && user) {
          const response = await fetch('/api/auth/me', {
            headers: getAuthHeaders(),
          });
          
          if (response.ok) {
            const userData = await response.json();
            const userTheme = userData.displaymode as Theme;
            setTheme(userTheme);
            applyTheme(userTheme);
          } else {
            // Fallback to system preference if API call fails
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const fallbackTheme = systemPrefersDark ? 'dark' : 'light';
            setTheme(fallbackTheme);
            applyTheme(fallbackTheme);
          }
        } else if (!initializing) {
          // Si pas d'utilisateur, utiliser la préférence système
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

    // Attendre que le router soit prêt
    if (router.isReady) {
      fetchUserTheme();
    }
  }, [getAuthHeaders, user, initializing, router.isReady, router.pathname]);

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
    // Ne pas essayer de mettre à jour la base de données sur les routes publiques
    if (publicRoutes.includes(router.pathname) || !user) {
      return;
    }

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