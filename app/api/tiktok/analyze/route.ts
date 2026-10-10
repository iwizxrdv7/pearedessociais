import { NextResponse } from 'next/server';
import { scrapeTikTokProfile, extractTikTokUsername } from '@/lib/tiktok_scraper';

export async function POST(req: Request) {
  try {
    const { url, max_items } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL ou @usuário do TikTok é obrigatório.' }, { status: 400 });
    }

    const username = extractTikTokUsername(url);

    // 1. Tentar conectar ao serviço backend FastAPI se configurado em nuvem
    if (process.env.BACKEND_API_URL && !process.env.BACKEND_API_URL.includes('127.0.0.1') && !process.env.BACKEND_API_URL.includes('localhost')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const fastApiRes = await fetch(`${process.env.BACKEND_API_URL}/api/tiktok/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, max_items: Number(max_items || 0) }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (fastApiRes.ok) {
          const fastApiData = await fastApiRes.json();
          const rawVideos = fastApiData.data?.videos || [];

          const formattedVideos = rawVideos.map((v: any) => ({
            id: v.id,
            url: v.url || v.play_url || `https://www.tiktok.com/@${username}/video/${v.id}`,
            thumbnail: v.cover || v.thumbnail || '',
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
              user_info: fastApiData.data?.user_info || {
                username,
                nickname: username,
                avatar: formattedVideos[0]?.thumbnail || '',
                signature: 'Perfil TikTok verificado',
                follower_count: 0,
                video_count: formattedVideos.length,
              },
              videos: formattedVideos,
            },
          });
        }
      } catch (backendErr) {
        console.warn('Backend em nuvem demorou, usando scraper nativo Vercel:', backendErr);
      }
    }

    // 2. Scraper Serverless Cloud-Native direto
    const data = await scrapeTikTokProfile(url, Number(max_items || 0));
    return NextResponse.json({ status: 'success', data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao analisar perfil do TikTok.' }, { status: 400 });
  }
}
