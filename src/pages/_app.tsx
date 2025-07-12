import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';

function AppContent({ Component, pageProps }: AppProps) {
  const { theme, isLoading } = useTheme();

  // Apply theme immediately when it changes
  useEffect(() => {
    if (!isLoading) {
      const html = document.documentElement;
      
      if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        html.classList.add('dark');
      } else {
        html.removeAttribute('data-theme');
        html.classList.remove('dark');
      }
    }
  }, [theme, isLoading]);

  return (
    <ProtectedRoute>
      <Navigation />
      <main className="container mx-auto p-4 md:p-8 mb-20 md:mb-0 mt-16 md:mt-0">
        <Component {...pageProps} />
      </main>
      <Toaster />
    </ProtectedRoute>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
}