// app/api/push/route.ts
import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;

type TargetRole = "dad" | "son" | "mom";

interface PushBody {
  // یکی از این دو را بده:
  to?: TargetRole;              // ارسال بر اساس تگ نقش
  externalId?: string;          // یا ارسال دقیق به یک نفر (external_id)

  title: string;
  body: string;
  scheduleAt?: string | null;   // ISO time – اگر خالی باشد فوری ارسال می‌شود
}

type OneSignalTagCondition = { key: string; relation: "="; value: string };

interface OneSignalPayload {
  app_id: string;
  headings: Record<string, string>;
  contents: Record<string, string>;
  tags?: OneSignalTagCondition[];
  include_external_user_ids?: string[];
  url?: string;
  send_after?: string; // RFC2822 یا ISO
}

interface OneSignalResp {
  id?: string;
  errors?: unknown;
  [k: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { to, externalId, title, body, scheduleAt } =
      (await req.json()) as PushBody;

    const payload: OneSignalPayload = {
      app_id: APP_ID,
      headings: { en: title, fa: title },
      contents: { en: body, fa: body },
      url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
      send_after: scheduleAt || undefined,
    };

    // هدف‌گیری: یا بر اساس نقش (Tag)، یا بر اساس external_id
    if (externalId) {
      payload.include_external_user_ids = [externalId];
    } else if (to) {
      payload.tags = [{ key: "role", relation: "=", value: to }];
    } else {
      return NextResponse.json(
        { ok: false, error: "target missing: to or externalId" },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${REST_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as OneSignalResp;
    if (!res.ok) {
      console.error("OneSignal error:", data);
      return NextResponse.json({ ok: false, error: data }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
