import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="fr" className="mobile-viewport">
      <Head>
        {/* Mobile Optimization Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Prevent zoom on input focus (iOS) */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="application-name" content="Master Tasklist" />
        <meta name="apple-mobile-web-app-title" content="Master Tasklist" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Initialize with light theme by default
                  // The actual user preference will be loaded from database by useTheme hook
                  document.documentElement.removeAttribute('data-theme');
                  document.documentElement.classList.remove('dark');
                  
                  // Prevent horizontal scroll
                  document.documentElement.style.overflowX = 'hidden';
                  document.body.style.overflowX = 'hidden';
                  
                  // Add touch manipulation for better mobile performance
                  document.documentElement.style.touchAction = 'manipulation';
                } catch (e) {}
              })();
            `,
          }}
        />
      </Head>
      <body className="mobile-no-scroll touch-manipulation">
        <Main />
        <Script src="https://assets.co.dev/files/codevscript.js" strategy="afterInteractive" />
        <NextScript />
      </body>
    </Html>
  );
}
