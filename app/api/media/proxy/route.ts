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

    let contentType = mediaRes.headers.get('content-type') || 'application/octet-stream';
    const buffer = await mediaRes.arrayBuffer();
    const u8 = new Uint8Array(buffer);

    // Detecção segura por magic bytes
    if (u8[0] === 0xff && u8[1] === 0xd8) {
      contentType = 'image/jpeg';
    } else if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
      contentType = 'image/png';
    } else if (u8.length > 8 && String.fromCharCode(u8[4], u8[5], u8[6], u8[7]) === 'ftyp') {
      contentType = 'video/mp4';
    }

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
