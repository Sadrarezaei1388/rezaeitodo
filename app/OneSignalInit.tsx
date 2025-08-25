'use client';
import { useEffect } from 'react';

declare global {
  interface Window { OneSignalDeferred?: any[]; }
}

/** نامرئی، فقط OneSignal را راه‌اندازی می‌کند */
export default function OneSignalInit() {
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
        promptOptions: { slidedown: { enabled: true, autoPrompt: true } },
      });
    });
  }, []);
  return null;
}

/** توابع کمکی برای لاگین و تگ‌گذاری کاربر فعلی */
export async function onesignalLogin(externalId: string, role: 'dad'|'son'|'mom') {
  // @ts-ignore
  const q = (fn: any) => (window.OneSignalDeferred = (window.OneSignalDeferred||[])).push(fn);
  q(async (OneSignal: any) => {
    try {
      await OneSignal.login(externalId);
      await OneSignal.User.addTag('role', role);
    } catch (e) { console.log('OneSignal login error', e); }
  });
}