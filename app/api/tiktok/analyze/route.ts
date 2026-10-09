import { NextResponse } from 'next/server';
import { executePythonBridge } from '@/lib/mediahub_bridge';

export async function POST(req: Request) {
  try {
    const { url, max_items } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL ou @usuário do TikTok é obrigatório.' }, { status: 400 });
    }

    const data = await executePythonBridge(['tiktok_analyze', url, String(max_items || 0)]);
    return NextResponse.json({ status: 'success', data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao analisar perfil do TikTok.' }, { status: 400 });
  }
}
