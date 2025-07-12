import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Initialize with light theme by default
                  // The actual user preference will be loaded from database by useTheme hook
                  document.documentElement.removeAttribute('data-theme');
                  document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <Script src="https://assets.co.dev/files/codevscript.js" strategy="afterInteractive" />
        <NextScript />
      </body>
    </Html>
  );
}
