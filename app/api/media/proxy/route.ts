import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'URL da mídia é obrigatória.' }, { status: 400 });
    }

    const mediaRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': url.includes('instagram') ? 'https://www.instagram.com/' : url.includes('tiktok') ? 'https://www.tiktok.com/' : '',
      },
    });

    if (!mediaRes.ok) {
      return NextResponse.json({ error: `Falha ao obter mídia: ${mediaRes.statusText}` }, { status: mediaRes.status });
    }

    const contentType = mediaRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await mediaRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao processar proxy de mídia.' }, { status: 500 });
  }
}
