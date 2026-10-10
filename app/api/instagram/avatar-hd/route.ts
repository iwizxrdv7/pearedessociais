import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get('username') || searchParams.get('user') || '').replace(/^@/, '').trim();
    const fallbackUrl = searchParams.get('url') || '';

    if (!username && !fallbackUrl) {
      return NextResponse.json({ error: 'Username ou URL é obrigatório.' }, { status: 400 });
    }

    const rawBackendUrl = process.env.BACKEND_API_URL || 'https://pearedessociais.onrender.com';
    const backendBase = rawBackendUrl.trim().replace(/\/+$/, '');

    // 1. Tentar obter imagem processada 1080x1080 HD pelo backend Render
    if (username && backendBase && !backendBase.includes('127.0.0.1') && !backendBase.includes('localhost')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const backendRes = await fetch(`${backendBase}/api/instagram/avatar-hd?username=${encodeURIComponent(username)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (backendRes.ok) {
          const buffer = await backendRes.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Content-Disposition': `inline; filename="avatar_${username}_1080x1080.jpg"`,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch (e) {
        console.warn('Backend avatar-hd falhou, tentando fallback:', e);
      }
    }

    // 2. Fallback: Proxy direto da imagem CDN
    const targetUrl = fallbackUrl || '';
    if (targetUrl) {
      const imgRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
      });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Disposition': `inline; filename="avatar_${username || 'perfil'}_1080x1080.jpg"`,
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    return NextResponse.json({ error: 'Não foi possível carregar o avatar HD.' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno no avatar HD.' }, { status: 500 });
  }
}
