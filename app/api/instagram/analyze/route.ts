import { NextResponse } from 'next/server';
import { scrapeInstagramProfile, extractInstagramUsername } from '@/lib/instagram_scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { url, max_items } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL ou @usuário do Instagram é obrigatório.' }, { status: 400 });
    }

    const username = extractInstagramUsername(url);

    // 1. Conectar ao backend FastAPI em nuvem (Render) com fallback automático e sanitização de barras
    const rawBackendUrl = process.env.BACKEND_API_URL || 'https://pearedessociais.onrender.com';
    const backendBase = rawBackendUrl.trim().replace(/\/+$/, '');

    if (backendBase && !backendBase.includes('127.0.0.1') && !backendBase.includes('localhost')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);

        const fastApiRes = await fetch(`${backendBase}/api/instagram/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: username || url, max_items: Number(max_items || 0) }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (fastApiRes.ok) {
          const fastApiData = await fastApiRes.json();
          const rawPosts = fastApiData.data?.posts || fastApiData.data?.videos || [];
          const rawUser = fastApiData.data?.user || fastApiData.data?.user_info || {};
          const rawHighlights = fastApiData.data?.highlights || [];

          function proxyMediaUrl(u: string | undefined): string {
            if (!u) return '';
            if (u.startsWith('/api/') || u.startsWith('data:')) return u;
            return `/api/media/proxy?url=${encodeURIComponent(u)}`;
          }

          const formattedPosts = rawPosts.map((p: any) => {
            const rawThumb = p.cover || p.thumbnail || p.play_url || '';
            return {
              id: p.id,
              url: p.type === 'avatar'
                ? (p.play_url || p.cover || '')
                : (p.play_url?.startsWith('http') && !p.play_url.includes('.mp4') && !p.play_url.includes('.jpg')
                    ? p.play_url
                    : `https://www.instagram.com/p/${p.id}/`),
              thumbnail: proxyMediaUrl(rawThumb),
              caption: p.title || p.caption || 'Sem legenda',
              is_video: p.is_video ?? (p.type === 'reel' || (p.play_url && p.play_url.includes('.mp4'))),
              like_count: p.like_count || 0,
              comment_count: p.comment_count || 0,
              view_count: p.view_count || 0,
              save_count: p.save_count || 0,
              direct_media_url: p.play_url || p.cover || '',
              type: p.type || (p.is_video ? 'reel' : 'photo'),
              highlight_id: p.highlight_id,
              highlight_name: p.highlight_name,
              story_index: p.story_index,
            };
          });

          // Garantir que a Foto de Perfil HD está incluída na lista de mídias para exibição e download com super-resolução
          const avatarUrl = rawUser.avatar || '';
          const targetUsername = rawUser.username || username;
          const avatarHdUrl = `/api/instagram/avatar-hd?username=${encodeURIComponent(targetUsername)}&url=${encodeURIComponent(avatarUrl)}`;

          const existingAvatarIdx = formattedPosts.findIndex((p: any) => p.type === 'avatar' || p.id === 'avatar_profile');
          if (existingAvatarIdx >= 0) {
            formattedPosts[existingAvatarIdx].direct_media_url = avatarHdUrl;
            formattedPosts[existingAvatarIdx].thumbnail = proxyMediaUrl(avatarUrl);
            formattedPosts[existingAvatarIdx].caption = `Foto de Perfil HD (1080x1080) - @${targetUsername}`;
          } else if (avatarUrl) {
            formattedPosts.push({
              id: 'avatar_profile',
              url: avatarHdUrl,
              thumbnail: proxyMediaUrl(avatarUrl),
              caption: `Foto de Perfil HD (1080x1080) - @${targetUsername}`,
              is_video: false,
              like_count: 0,
              comment_count: 0,
              view_count: 0,
              save_count: 0,
              direct_media_url: avatarHdUrl,
              type: 'avatar',
            });
          }

          const formattedHighlights = rawHighlights.map((h: any) => ({
            ...h,
            cover: proxyMediaUrl(h.cover || avatarUrl),
          }));

          return NextResponse.json({
            status: 'success',
            data: {
              user_info: {
                username: rawUser.username || username,
                nickname: rawUser.nickname || rawUser.username || username,
                avatar: proxyMediaUrl(rawUser.avatar || avatarUrl),
                signature: rawUser.signature || rawUser.biography || 'Perfil do Instagram',
                follower_count: rawUser.followers_count || rawUser.follower_count || 0,
                following_count: rawUser.following_count || 0,
                post_count: rawUser.posts_count || formattedPosts.length,
              },
              posts: formattedPosts,
              highlights: formattedHighlights,
            },
          });
        }
      } catch (backendErr) {
        console.warn('Backend em nuvem demorou ou indisponível, usando scraper nativo Vercel:', backendErr);
      }
    }

    // 2. Scraper Serverless Cloud-Native direto (Roda 100% na Vercel)
    const data = await scrapeInstagramProfile(url, Number(max_items || 0));
    const avatarUrl = data?.user_info?.avatar || '';
    const targetUsername = data?.user_info?.username || username;
    const avatarHdUrl = `/api/instagram/avatar-hd?username=${encodeURIComponent(targetUsername)}&url=${encodeURIComponent(avatarUrl)}`;

    if (data?.posts) {
      data.posts = data.posts.map((p: any) => ({
        ...p,
        thumbnail: p.thumbnail && !p.thumbnail.startsWith('/api/') ? `/api/media/proxy?url=${encodeURIComponent(p.thumbnail)}` : p.thumbnail,
      }));
      const hasAvatar = data.posts.some((p: any) => p.type === 'avatar');
      if (!hasAvatar && avatarUrl) {
        data.posts.push({
          id: 'avatar_profile',
          url: avatarHdUrl,
          thumbnail: avatarUrl.startsWith('/api/') ? avatarUrl : `/api/media/proxy?url=${encodeURIComponent(avatarUrl)}`,
          caption: `Foto de Perfil HD (1080x1080) - @${targetUsername}`,
          is_video: false,
          like_count: 0,
          comment_count: 0,
          view_count: 0,
          save_count: 0,
          direct_media_url: avatarHdUrl,
          type: 'avatar',
        });
      }
    }
    if (data?.user_info?.avatar && !data.user_info.avatar.startsWith('/api/')) {
      data.user_info.avatar = `/api/media/proxy?url=${encodeURIComponent(data.user_info.avatar)}`;
    }
    return NextResponse.json({ status: 'success', data });
  } catch (err: any) {
    console.error('Erro na rota /api/instagram/analyze:', err);
    return NextResponse.json({ error: err.message || 'Falha ao analisar perfil do Instagram.' }, { status: 400 });
  }
}
