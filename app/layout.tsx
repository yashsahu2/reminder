import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyMedies — Prescription Scanner & Pill Reminder",
  description: "Simple, easy prescription scanner and medicine reminder app.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MyMedies",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var origReplace = window.history.replaceState;
                  if (typeof origReplace === 'function') {
                    window.history.replaceState = function(data, unused, url) {
                      try {
                        return origReplace.apply(this, arguments);
                      } catch (err) {
                        if (err && (err.message || '').indexOf('Browser Locker') !== -1) {
                          console.warn('Suppressed extension error on replaceState:', err.message);
                          return;
                        }
                        throw err;
                      }
                    };
                  }

                  var origPush = window.history.pushState;
                  if (typeof origPush === 'function') {
                    window.history.pushState = function(data, unused, url) {
                      try {
                        return origPush.apply(this, arguments);
                      } catch (err) {
                        if (err && (err.message || '').indexOf('Browser Locker') !== -1) {
                          console.warn('Suppressed extension error on pushState:', err.message);
                          return;
                        }
                        throw err;
                      }
                    };
                  }

                  window.addEventListener('error', function(event) {
                    var msg = (event && event.message) || '';
                    var fn = (event && event.filename) || '';
                    if (msg.indexOf('Breaking Browser Locker') !== -1 || fn.indexOf('injection-tss-mv3') !== -1) {
                      event.preventDefault();
                      if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                      console.warn('Prevented crash from browser extension false-positive:', msg);
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = (event && event.reason) || {};
                    var msg = reason.message || '';
                    var stack = reason.stack || '';
                    if (msg.indexOf('Breaking Browser Locker') !== -1 || stack.indexOf('injection-tss-mv3') !== -1) {
                      event.preventDefault();
                      console.warn('Prevented unhandled rejection from browser extension:', msg);
                    }
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#f6f7fb] text-gray-900 antialiased min-h-screen select-none">
        {children}
      </body>
    </html>
  );
}
