import { NextRequest, NextResponse } from 'next/server';

const APP_ID = process.env.ONESIGNAL_APP_ID!;
const REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!; // سرّی، فقط سرور می‌بیند

export async function POST(req: NextRequest) {
  try {
    const { to, title, body, scheduleAt } = await req.json() as {
      to: 'dad'|'son'|'mom';
      title: string;
      body: string;
      scheduleAt?: string | null;
    };

    const payload: any = {
      app_id: APP_ID,
      headings: { en: title, fa: title },
      contents: { en: body, fa: body },
      tags: [{ key: 'role', relation: '=', value: to }],
      url: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    };

    if (scheduleAt) payload.send_after = new Date(scheduleAt).toUTCString();

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${REST_API_KEY}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('OneSignal error:', data);
      return NextResponse.json({ ok: false, error: data }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}