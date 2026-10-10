import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const backendBase = (process.env.BACKEND_API_URL || 'https://pearedessociais.onrender.com').trim().replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${backendBase}/api/health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        status: 'online',
        cloud_engine: 'online',
        time: data.time || new Date().toISOString(),
      });
    }
  } catch {
    // Backend em hibernação / acordando
  }

  return NextResponse.json({
    status: 'warming_up',
    cloud_engine: 'warming_up',
    time: new Date().toISOString(),
  });
}
