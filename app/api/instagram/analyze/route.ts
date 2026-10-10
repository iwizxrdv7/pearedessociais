import { NextResponse } from 'next/server';
import { scrapeInstagramProfile } from '@/lib/instagram_scraper';

export async function POST(req: Request) {
  try {
    const { url, max_items } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL ou @usuário do Instagram é obrigatório.' }, { status: 400 });
    }

    const data = await scrapeInstagramProfile(url, Number(max_items || 0));
    return NextResponse.json({ status: 'success', data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao analisar perfil do Instagram.' }, { status: 400 });
  }
}
