// app/api/push/route.ts
import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!; // Private

type TargetRole = 'dad' | 'son' | 'mom';

interface PushBody {
  to: TargetRole;
  title: string;
  body: string;
  scheduleAt?: string | null;
}

type OneSignalTagCondition = { key: string; relation: '='; value: string };

interface OneSignalPayload {
  app_id: string;
  headings: Record<string, string>;
  contents: Record<string, string>;
  tags: OneSignalTagCondition[];
  url?: string;
  send_after?: string; // RFC 2822/UTC string
}

interface OneSignalResp {
  id?: string;
  errors?: unknown;
  [k: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { to, title, body, scheduleAt } = (await req.json()) as PushBody;

    const payload: OneSignalPayload = {
      app_id: APP_ID,
      headings: { en: title, fa: title },
      contents: { en: body, fa: body },
      tags: [{ key: 'role', relation: '=', value: to }],
      url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
      send_after: scheduleAt || undefined,
    };

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${REST_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as OneSignalResp;
    if (!res.ok) {
      console.error('OneSignal error:', data);
      return NextResponse.json({ ok: false, error: data }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
