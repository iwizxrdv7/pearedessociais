import { NextResponse } from 'next/server';
import { scrapeTikTokProfile, extractTikTokUsername } from '@/lib/tiktok_scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function proxyMediaUrl(u: string | undefined): string {
  if (!u) return '';
  if (u.startsWith('/api/') || u.startsWith('data:')) return u;
  return `/api/media/proxy?url=${encodeURIComponent(u)}`;
}

export async function POST(req: Request) {
  try {
    const { url, max_items } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL ou @usuário do TikTok é obrigatório.' }, { status: 400 });
    }

    const username = extractTikTokUsername(url);

    // 1. Conectar ao backend FastAPI em nuvem (Render) com suporte a inicialização e timeout estendido
    const rawBackendUrl = process.env.BACKEND_API_URL || 'https://pearedessociais.onrender.com';
    const backendBase = rawBackendUrl.trim().replace(/\/+$/, '');

    if (backendBase && !backendBase.includes('127.0.0.1') && !backendBase.includes('localhost')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const fastApiRes = await fetch(`${backendBase}/api/tiktok/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: username || url, max_items: Number(max_items || 0) }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (fastApiRes.ok) {
          const fastApiData = await fastApiRes.json();
          const rawVideos = fastApiData.data?.videos || [];
          const rawUser = fastApiData.data?.user || fastApiData.data?.user_info || {};

          const formattedVideos = rawVideos.map((v: any) => ({
            id: v.id,
            url: v.url || v.play_url || `https://www.tiktok.com/@${username}/video/${v.id}`,
            thumbnail: proxyMediaUrl(v.cover || v.thumbnail || ''),
            title: v.title || 'Vídeo sem título',
            duration: v.duration || 0,
            view_count: v.view_count || 0,
            like_count: v.like_count || 0,
            comment_count: v.comment_count || 0,
            direct_video_url: v.play_url || v.direct_video_url || '',
          }));

          return NextResponse.json({
            status: 'success',
            data: {
              user_info: {
                username: rawUser.username || username,
                nickname: rawUser.nickname || username,
                avatar: proxyMediaUrl(rawUser.avatar || formattedVideos[0]?.thumbnail || ''),
                signature: rawUser.signature || 'Perfil TikTok verificado',
                follower_count: rawUser.follower_count || 0,
                video_count: rawUser.video_count || formattedVideos.length,
              },
              videos: formattedVideos,
            },
          });
        }
      } catch (backendErr) {
        console.warn('Backend em nuvem demorou ou indisponível, usando scraper nativo Vercel:', backendErr);
      }
    }

    // 2. Scraper Serverless Cloud-Native direto (Roda 100% na Vercel)
    const data = await scrapeTikTokProfile(url, Number(max_items || 0));
    if (data?.videos) {
      data.videos = data.videos.map((v: any) => ({
        ...v,
        thumbnail: proxyMediaUrl(v.thumbnail),
      }));
    }
    if (data?.user_info?.avatar) {
      data.user_info.avatar = proxyMediaUrl(data.user_info.avatar);
    }
    return NextResponse.json({ status: 'success', data });
  } catch (err: any) {
    console.error('Erro na rota /api/tiktok/analyze:', err);
    return NextResponse.json({ error: err.message || 'Falha ao analisar perfil do TikTok.' }, { status: 400 });
  }
}
