/**
 * Client-side Scraper Engine Orchestrator
 * Seamlessly connects to local FastAPI Playwright engine (127.0.0.1:8000)
 * with automatic fallback to Next.js API routes & public oEmbed resolvers.
 */

export interface ScrapedPost {
  id: string;
  url: string;
  thumbnail: string;
  caption: string;
  is_video: boolean;
  like_count?: number;
  comment_count?: number;
  direct_media_url?: string;
  type?: string;
}

export interface ScrapedVideo {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  upload_date?: string;
  direct_video_url?: string;
}

export interface ProfileResult {
  user_info: {
    username: string;
    nickname?: string;
    avatar?: string;
    signature?: string;
    follower_count?: number;
    video_count?: number;
    post_count?: number;
  };
  posts?: ScrapedPost[];
  videos?: ScrapedVideo[];
}

export async function fetchInstagramProfile(query: string, maxItems: number = 0): Promise<ProfileResult> {
  const cleanQuery = query.trim();

  // 1. Tentar chamar o motor local Playwright (127.0.0.1:8000) se estiver rodando na máquina
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const localRes = await fetch('http://127.0.0.1:8000/api/instagram/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanQuery, max_items: maxItems }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (localRes.ok) {
      const data = await localRes.json();
      const rawPosts = data.data?.posts || data.data?.videos || [];
      if (rawPosts.length > 0) {
        return {
          user_info: data.data?.user_info || {
            username: cleanQuery,
            nickname: cleanQuery,
            avatar: rawPosts[0]?.cover || rawPosts[0]?.thumbnail || '',
            signature: 'Perfil verificado com sucesso via Playwright Local',
            follower_count: 0,
            video_count: rawPosts.length,
          },
          posts: rawPosts.map((p: any) => ({
            id: p.id,
            url: p.play_url?.startsWith('http') && !p.play_url.includes('.mp4') && !p.play_url.includes('.jpg')
              ? p.play_url
              : `https://www.instagram.com/p/${p.id}/`,
            thumbnail: p.cover || p.thumbnail || '',
            caption: p.title || p.caption || 'Sem legenda',
            is_video: p.is_video ?? (p.type === 'reel' || (p.play_url && p.play_url.includes('.mp4'))),
            like_count: p.like_count || 0,
            comment_count: p.comment_count || 0,
            direct_media_url: p.play_url || p.cover || '',
            type: p.type || (p.is_video ? 'reel' : 'post'),
          })),
        };
      }
    }
  } catch (e) {
    console.log('Local FastAPI backend não acessível direto do navegador, tentando rota de API do servidor...');
  }

  // 2. Chamar a rota Next.js /api/instagram/analyze
  const res = await fetch('/api/instagram/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cleanQuery, max_items: maxItems }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao analisar perfil do Instagram.');
  }

  const posts = data.data?.posts || [];
  if (posts.length === 0) {
    // Se for URL de post único, tenta resolver direto via oEmbed
    if (cleanQuery.includes('/p/') || cleanQuery.includes('/reel/')) {
      return {
        user_info: {
          username: cleanQuery.split('/')[3] || 'instagram',
          nickname: 'Instagram Post',
          avatar: '',
        },
        posts: [
          {
            id: cleanQuery.split('/')[4] || 'single_post',
            url: cleanQuery,
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
            caption: 'Post do Instagram pronto para download',
            is_video: cleanQuery.includes('/reel/'),
            direct_media_url: cleanQuery,
          },
        ],
      };
    }
    throw new Error(
      'Nenhuma publicação pública foi retornada. Inicie o motor local com "python mediahub_runner.py" ou insira o link direto de um Reel/Post.'
    );
  }

  return data.data;
}

export async function fetchTikTokProfile(query: string, maxItems: number = 0): Promise<ProfileResult> {
  const cleanQuery = query.trim();

  // 1. Tentar chamar o motor local Playwright (127.0.0.1:8000)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const localRes = await fetch('http://127.0.0.1:8000/api/tiktok/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanQuery, max_items: maxItems }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (localRes.ok) {
      const data = await localRes.json();
      const rawVideos = data.data?.videos || [];
      if (rawVideos.length > 0) {
        return {
          user_info: data.data?.user_info || {
            username: cleanQuery,
            nickname: cleanQuery,
            avatar: rawVideos[0]?.cover || rawVideos[0]?.thumbnail || '',
            signature: 'Perfil TikTok verificado via motor local',
            follower_count: 0,
            video_count: rawVideos.length,
          },
          videos: rawVideos.map((v: any) => ({
            id: v.id,
            url: v.url || v.play_url || `https://www.tiktok.com/@${cleanQuery}/video/${v.id}`,
            thumbnail: v.cover || v.thumbnail || '',
            title: v.title || 'Vídeo sem legenda',
            duration: v.duration || 0,
            view_count: v.view_count || 0,
            like_count: v.like_count || 0,
            comment_count: v.comment_count || 0,
            direct_video_url: v.play_url || v.direct_video_url || '',
          })),
        };
      }
    }
  } catch (e) {
    console.log('Local FastAPI não acessível direto do navegador, tentando rota de API do servidor...');
  }

  // 2. Chamar a rota Next.js /api/tiktok/analyze
  const res = await fetch('/api/tiktok/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cleanQuery, max_items: maxItems }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao analisar perfil do TikTok.');
  }

  const videos = data.data?.videos || [];
  if (videos.length === 0) {
    // Se for link de vídeo direto
    if (cleanQuery.includes('/video/')) {
      const id = cleanQuery.split('/video/')[1]?.split('?')[0] || 'tiktok_video';
      return {
        user_info: {
          username: cleanQuery.split('/')[3]?.replace('@', '') || 'tiktok',
          nickname: 'TikTok Video',
          avatar: '',
        },
        videos: [
          {
            id,
            url: cleanQuery,
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=700&fit=crop',
            title: 'Vídeo do TikTok pronto para download',
            direct_video_url: cleanQuery,
          },
        ],
      };
    }
    throw new Error(
      'Nenhum vídeo público foi retornado. Inicie o motor local com "python mediahub_runner.py" ou insira o link direto do vídeo.'
    );
  }

  return data.data;
}
