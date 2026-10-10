import { NextResponse } from 'next/server';
import { scrapeInstagramProfile, extractInstagramUsername } from '@/lib/instagram_scraper';

export async function POST(req: Request) {
  try {
    const { url, max_items } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL ou @usuário do Instagram é obrigatório.' }, { status: 400 });
    }

    const username = extractInstagramUsername(url);

    // 1. Tentar conectar ao serviço backend FastAPI local se disponível
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const fastApiRes = await fetch(`${backendUrl}/api/instagram/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, max_items: Number(max_items || 0) }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (fastApiRes.ok) {
        const fastApiData = await fastApiRes.json();
        const rawPosts = fastApiData.data?.posts || fastApiData.data?.videos || [];
        const rawUser = fastApiData.data?.user || fastApiData.data?.user_info || {};
        const rawHighlights = fastApiData.data?.highlights || [];

        const formattedPosts = rawPosts.map((p: any) => ({
          id: p.id,
          url: p.play_url?.startsWith('http') && !p.play_url.includes('.mp4') && !p.play_url.includes('.jpg')
            ? p.play_url
            : `https://www.instagram.com/p/${p.id}/`,
          thumbnail: p.cover || p.thumbnail || '',
          caption: p.title || p.caption || 'Sem legenda',
          is_video: p.is_video ?? (p.type === 'reel' || (p.play_url && p.play_url.includes('.mp4'))),
          like_count: p.like_count || 0,
          comment_count: p.comment_count || 0,
          view_count: p.view_count || 0,
          save_count: p.save_count || 0,
          direct_media_url: p.play_url || p.cover || '',
          type: p.type || (p.is_video ? 'reel' : 'post'),
          highlight_name: p.highlight_name,
        }));

        return NextResponse.json({
          status: 'success',
          data: {
            user_info: {
              username: rawUser.username || username,
              nickname: rawUser.nickname || rawUser.username || username,
              avatar: rawUser.avatar || formattedPosts[0]?.thumbnail || '',
              signature: rawUser.signature || rawUser.biography || 'Perfil do Instagram',
              follower_count: rawUser.followers_count || rawUser.follower_count || 0,
              following_count: rawUser.following_count || 0,
              post_count: rawUser.posts_count || formattedPosts.length,
            },
            posts: formattedPosts,
            highlights: rawHighlights,
          },
        });
      }
    } catch (backendErr) {
      console.warn('Backend FastAPI indisponível ou demorou para responder, usando scraper serverless:', backendErr);
    }

    // 2. Fallback: Scraper Serverless direto
    const data = await scrapeInstagramProfile(url, Number(max_items || 0));
    return NextResponse.json({ status: 'success', data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao analisar perfil do Instagram.' }, { status: 400 });
  }
}
