import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { Navigation } from '@/components/Navigation';
import { Toaster } from '@/components/ui/sonner';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navigation />
      <main className="container mx-auto p-4 md:p-8 mb-20 md:mb-0 mt-16 md:mt-0">
        <Component {...pageProps} />
      </main>
      <Toaster />
    </>
  );
}