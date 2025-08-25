// app/layout.tsx
import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import Script from 'next/script';
import './globals.css'; // اگر این فایل را نداری، این خط را حذف کن

export const metadata: Metadata = {
  title: 'Family Taskboard',
  description: 'مامان‌محور با نقش‌ها و ددلاین',
};

const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '600', '700'],
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* PWA manifest (اختیاری) */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#111827" />

        {/* Only add OneSignal SDK – بدون تغییر استایل/دیزاین */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
          defer
        />
      </head>
      <body
        className={`${vazir.className} font-sans text-slate-900 bg-[#f7f6f5]
                    [background-image:radial-gradient(#e9e7e5_1px,transparent_1px)]
                    [background-size:14px_14px] [background-position:0_0]`}
      >
        {children}
      </body>
    </html>
  );
}
