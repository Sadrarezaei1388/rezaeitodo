// app/OneSignalInit.tsx
"use client";
import { useEffect } from "react";

// نوع‌های مینیمال برای OneSignal
type InitOptions = {
  appId?: string;
  allowLocalhostAsSecureOrigin?: boolean;
  notifyButton?: { enable?: boolean };
  promptOptions?: { slidedown?: { enabled?: boolean; autoPrompt?: boolean } };
};
type OneSignalUser = { addTag: (key: string, value: string) => Promise<void> };
type OneSignalSDK = {
  init: (opts: InitOptions) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  User: OneSignalUser;
};

declare global {
  interface Window {
    OneSignalDeferred?: ((OneSignal: OneSignalSDK) => void)[];
  }
}

/** نامرئی؛ فقط OneSignal را راه‌اندازی می‌کند */
export default function OneSignalInit() {
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalSDK) => {
      await OneSignal.init({
        appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        notifyButton: { enable: false },
        // با تنظیمات پرامپت پیش‌فرضی که در داشبورد تعریف کردی همخوانه
        promptOptions: { slidedown: { enabled: true, autoPrompt: true } },
      });
    });
  }, []);
  return null;
}

/** لاگین و ست‌کردن تگ نقش کاربر */
export function onesignalLogin(externalId: string, role: "dad" | "son" | "mom") {
  const push = (fn: (os: OneSignalSDK) => void) => {
    (window.OneSignalDeferred = window.OneSignalDeferred || []).push(fn);
  };
  push(async (OneSignal) => {
    try {
      await OneSignal.login(externalId);
      await OneSignal.User.addTag("role", role);
    } catch (e) {
      console.error("OneSignal login error", e);
    }
  });
}
