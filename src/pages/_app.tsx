import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <Navigation />
        <main className="container mx-auto p-4 md:p-8 mb-20 md:mb-0 mt-16 md:mt-0">
          <Component {...pageProps} />
        </main>
        <Toaster />
      </ProtectedRoute>
    </AuthProvider>
  );
}