/**
 * Client-side Scraper Engine Orchestrator
 * Cloud-Native on Vercel with optional localhost engine fallback
 */

export interface ScrapedHighlight {
  id: string;
  highlight_id?: string;
  title: string;
  cover: string;
  url: string;
  story_count?: number;
}

export interface ScrapedPost {
  id: string;
  url: string;
  thumbnail: string;
  caption: string;
  is_video: boolean;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  save_count?: number;
  order_index?: number;
  direct_media_url?: string;
  type?: string;
  highlight_id?: string;
  highlight_name?: string;
  story_index?: number;
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
    following_count?: number;
    video_count?: number;
    post_count?: number;
  };
  posts?: ScrapedPost[];
  highlights?: ScrapedHighlight[];
  videos?: ScrapedVideo[];
}

export async function fetchInstagramProfile(query: string, maxItems: number = 0): Promise<ProfileResult> {
  const cleanQuery = query.trim();

  // 1. Se estiver rodando estritamente em localhost, pode tentar o motor local se ativo
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalhost) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

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
        const rawUser = data.data?.user || data.data?.user_info || {};
        const rawHighlights: ScrapedHighlight[] = data.data?.highlights || [];

        if (rawPosts.length > 0) {
          const feedPosts = rawPosts.filter((p: any) => p.type !== 'highlight' && p.type !== 'avatar');
          const highlightPosts = rawPosts.filter((p: any) => p.type === 'highlight');
          const avatarPosts = rawPosts.filter((p: any) => p.type === 'avatar');

          const limitedFeedPosts = maxItems > 0 ? feedPosts.slice(0, maxItems) : feedPosts;
          const finalPosts = [...limitedFeedPosts, ...highlightPosts, ...avatarPosts];

          return {
            user_info: {
              username: rawUser.username || cleanQuery,
              nickname: rawUser.nickname || rawUser.username || cleanQuery,
              avatar: rawUser.avatar || finalPosts[0]?.cover || finalPosts[0]?.thumbnail || '',
              signature: rawUser.signature || 'Perfil do Instagram',
              follower_count: Number(rawUser.followers_count) || 0,
              following_count: Number(rawUser.following_count) || 0,
              video_count: limitedFeedPosts.length,
            },
            highlights: rawHighlights,
            posts: finalPosts.map((p: any, idx: number) => ({
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
              order_index: p.order_index ?? idx + 1,
              direct_media_url: p.play_url || p.cover || '',
              type: p.type || (p.is_video ? 'reel' : 'photo'),
              highlight_id: p.highlight_id,
              highlight_name: p.highlight_name,
              story_index: p.story_index,
            })),
          };
        }
      }
    } catch {
      // Ignora e prossegue para a rota de API em nuvem
    }
  }

  // 2. Chamar a rota Next.js /api/instagram/analyze (100% nativa em nuvem na Vercel)
  const res = await fetch('/api/instagram/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: cleanQuery, max_items: maxItems }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao analisar perfil do Instagram.');
  }

  const posts = data.data?.posts || data.data?.videos || [];
  const rawUser = data.data?.user || data.data?.user_info || {};
  const rawHighlights: ScrapedHighlight[] = data.data?.highlights || [];

  if (posts.length === 0) {
    if (cleanQuery.includes('/p/') || cleanQuery.includes('/reel/')) {
      const parts = cleanQuery.split('/');
      const sc = parts[4] || 'single_post';
      return {
        user_info: {
          username: parts[3] || 'instagram',
          nickname: 'Post Instagram',
          avatar: '',
        },
        posts: [
          {
            id: sc,
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
      `Nenhuma publicação pública foi retornada para "${cleanQuery}". Verifique se o perfil existe e é público.`
    );
  }

  const feedPosts = posts.filter((p: any) => p.type !== 'highlight' && p.type !== 'avatar');
  const highlightPosts = posts.filter((p: any) => p.type === 'highlight');
  const avatarPosts = posts.filter((p: any) => p.type === 'avatar');

  const limitedFeedPosts = maxItems > 0 ? feedPosts.slice(0, maxItems) : feedPosts;
  const finalPosts = [...limitedFeedPosts, ...highlightPosts, ...avatarPosts];

  return {
    user_info: {
      username: rawUser.username || cleanQuery,
      nickname: rawUser.nickname || rawUser.username || cleanQuery,
      avatar: rawUser.avatar || finalPosts[0]?.thumbnail || '',
      signature: rawUser.signature || 'Perfil Instagram',
      follower_count: Number(rawUser.follower_count || rawUser.followers_count) || 0,
      following_count: Number(rawUser.following_count) || 0,
      video_count: limitedFeedPosts.length,
    },
    highlights: rawHighlights,
    posts: finalPosts.map((p: any, idx: number) => ({
      id: p.id,
      url: p.url || p.play_url || `https://www.instagram.com/p/${p.id}/`,
      thumbnail: p.thumbnail || p.cover || '',
      caption: p.caption || p.title || 'Sem legenda',
      is_video: p.is_video ?? true,
      like_count: p.like_count || 0,
      comment_count: p.comment_count || 0,
      view_count: p.view_count || 0,
      save_count: p.save_count || 0,
      order_index: p.order_index ?? idx + 1,
      direct_media_url: p.direct_media_url || p.play_url || '',
      type: p.type || 'reel',
      highlight_id: p.highlight_id,
      highlight_name: p.highlight_name,
      story_index: p.story_index,
    })),
  };
}

export async function fetchTikTokProfile(query: string, maxItems: number = 0): Promise<ProfileResult> {
  const cleanQuery = query.trim();

  // 1. Se estiver rodando estritamente em localhost, pode tentar o motor local se ativo
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocalhost) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

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
        const rawUser = data.data?.user_info || data.data?.user || {};

        if (rawVideos.length > 0) {
          const limitedVideos = maxItems > 0 ? rawVideos.slice(0, maxItems) : rawVideos;
          return {
            user_info: {
              username: rawUser.username || cleanQuery,
              nickname: rawUser.nickname || cleanQuery,
              avatar: rawUser.avatar || limitedVideos[0]?.cover || limitedVideos[0]?.thumbnail || '',
              signature: rawUser.signature || 'Perfil TikTok verificado',
              follower_count: rawUser.follower_count || 0,
              video_count: limitedVideos.length,
            },
            videos: limitedVideos.map((v: any) => ({
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
    } catch {
      // Prossegue para a rota de API em nuvem
    }
  }

  // 2. Chamar a rota Next.js /api/tiktok/analyze (100% nativa em nuvem na Vercel)
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
  const rawUser = data.data?.user_info || data.data?.user || {};

  if (videos.length === 0) {
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
      `Nenhum vídeo público foi retornado para "${cleanQuery}". Verifique se o perfil existe e é público.`
    );
  }

  const limitedVideos = maxItems > 0 ? videos.slice(0, maxItems) : videos;

  return {
    user_info: {
      username: rawUser.username || cleanQuery,
      nickname: rawUser.nickname || cleanQuery,
      avatar: rawUser.avatar || limitedVideos[0]?.thumbnail || '',
      signature: rawUser.signature || 'Perfil TikTok',
      follower_count: rawUser.follower_count || 0,
      video_count: limitedVideos.length,
    },
    videos: limitedVideos.map((v: any) => ({
      id: v.id,
      url: v.url || `https://www.tiktok.com/@${cleanQuery}/video/${v.id}`,
      thumbnail: v.thumbnail || v.cover || '',
      title: v.title || 'Vídeo sem legenda',
      duration: v.duration || 0,
      view_count: v.view_count || 0,
      like_count: v.like_count || 0,
      comment_count: v.comment_count || 0,
      direct_video_url: v.direct_video_url || '',
    })),
  };
}
