// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Rezaei Family Todo",
  description: "Family taskboard with push notifications",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;800&display=swap"
          rel="stylesheet"
        />
        {/* SDK صفحه‌ی OneSignal (v16) */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
          defer
        />
      </head>
      <body className="font-sans bg-[radial-gradient(ellipse_at_top_right,rgba(120,119,198,0.35),transparent_35%),radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.35),transparent_30%),linear-gradient(180deg,#0b1020,#0b1020)] text-white">
        {children}
      </body>
    </html>
  );
}
