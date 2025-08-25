'use client';
import { useEffect } from 'react';

// تعریف Window برای OneSignal
declare global {
  interface Window {
    OneSignalDeferred?: ((OneSignal: Record<string, unknown>) => void)[];
  }
}

/** نامرئی، فقط OneSignal را راه‌اندازی می‌کند */
export default function OneSignalInit() {
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: Record<string, unknown>) => {
      // چون نوع دقیق OneSignal در SDK تعریف نشده، cast می‌کنیم
      const os = OneSignal as any;
      await os.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
        promptOptions: { slidedown: { enabled: true, autoPrompt: true } },
      });
    });
  }, []);
  return null;
}

/** تابع کمکی برای لاگین کاربر و ست‌کردن Tag نقش */
export async function onesignalLogin(externalId: string, role: 'dad' | 'son' | 'mom') {
  const q = (fn: (OneSignal: Record<string, unknown>) => void) =>
    (window.OneSignalDeferred = (window.OneSignalDeferred || [])).push(fn);

  q(async (OneSignal) => {
    try {
      const os = OneSignal as any;
      await os.login(externalId);
      await os.User.addTag('role', role);
    } catch (e) {
      console.error('OneSignal login error', e);
    }
  });
}
