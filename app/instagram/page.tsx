'use client';

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import {
  Instagram,
  Search,
  Download,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Film,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Loader2,
  Copy,
  Check,
  ArrowUpDown,
  Layers,
  Sparkle,
  User,
} from 'lucide-react';
import { downloadCleanSingleMedia, downloadCleanBatchZip } from '@/lib/media_downloader';
import { fetchInstagramProfile, ScrapedHighlight } from '@/lib/scraper_client';

interface InstagramPost {
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

interface ProfileInfo {
  username: string;
  nickname: string;
  avatar: string;
  signature: string;
  follower_count: number | string;
  following_count?: number | string;
  video_count: number;
  post_count?: number | string;
}

export default function InstagramDownloaderPage() {
  const [query, setQuery] = useState('');
  const [maxPosts, setMaxPosts] = useState('0');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [highlights, setHighlights] = useState<ScrapedHighlight[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtro de seções/abas e Ordenação
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent_to_old');
  const [copiedBio, setCopiedBio] = useState(false);

  // Estados de download
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [downloadingSingleId, setDownloadingSingleId] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setProfile(null);
    setPosts([]);
    setHighlights([]);
    setActiveTab('all');

    try {
      const data = await fetchInstagramProfile(query.trim(), Number(maxPosts));

      if (data.user_info) {
        setProfile(data.user_info as any);
      }

      if (data.highlights) {
        setHighlights(data.highlights);
      }

      const fetchedPosts: InstagramPost[] = (data.posts || []) as any;
      if (fetchedPosts.length === 0) {
        throw new Error('Nenhuma publicação encontrada para este perfil.');
      }

      setPosts(fetchedPosts);
      setSelectedIds(new Set(fetchedPosts.map((p) => p.id)));
      setSuccessMsg(`Encontradas ${fetchedPosts.length} mídias públicas (incluindo Stories dos Destaques) de alta qualidade!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBio = () => {
    if (!profile?.signature) return;
    navigator.clipboard.writeText(profile.signature);
    setCopiedBio(true);
    setTimeout(() => setCopiedBio(false), 2500);
  };

  // Contadores por categoria
  const counts = useMemo(() => {
    const photos = posts.filter((p) => p.type === 'photo');
    const reels = posts.filter((p) => p.type === 'reel');
    const avatar = posts.find((p) => p.type === 'avatar');
    return {
      all: posts.length,
      photos: photos.length,
      reels: reels.length,
      avatar: avatar ? 1 : 0,
      highlights: highlights.length,
    };
  }, [posts, highlights]);

  // Filtragem e Ordenação
  const displayedPosts = useMemo(() => {
    let filtered = posts.filter((p) => {
      if (activeTab === 'all') {
        return true; // Exibe tudo incluindo posts, reels, destaques e foto de perfil HD
      }
      if (activeTab === 'photos') {
        return p.type === 'photo';
      }
      if (activeTab === 'reels') {
        return p.type === 'reel';
      }
      if (activeTab === 'avatar') {
        return p.type === 'avatar';
      }
      if (activeTab.startsWith('highlight_')) {
        const hlId = activeTab.replace('highlight_', '');
        const targetHl = highlights.find((h) => h.id === activeTab || h.highlight_id === hlId);
        return (
          p.type === 'highlight' &&
          (p.highlight_id === hlId ||
            p.id.includes(hlId) ||
            (targetHl && p.highlight_name === targetHl.title))
        );
      }
      return true;
    });

    // Se filtrou por destaque específico e não achou post direto correspondente, usa o item de destaque
    if (activeTab.startsWith('highlight_') && filtered.length === 0) {
      const currentHl = highlights.find((h) => h.id === activeTab || h.highlight_id === activeTab.replace('highlight_', ''));
      if (currentHl) {
        filtered = [
          {
            id: currentHl.id,
            url: currentHl.url,
            thumbnail: currentHl.cover || profile?.avatar || '',
            caption: `Destaque: ${currentHl.title}`,
            is_video: false,
            type: 'highlight',
            highlight_name: currentHl.title,
            direct_media_url: currentHl.cover,
          },
        ];
      }
    }

    // Ordenação
    return [...filtered].sort((a, b) => {
      if (sortBy === 'recent_to_old') {
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      }
      if (sortBy === 'oldest_to_recent') {
        return (b.order_index ?? 0) - (a.order_index ?? 0);
      }
      if (sortBy === 'most_likes') {
        return (b.like_count || 0) - (a.like_count || 0);
      }
      if (sortBy === 'most_views') {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      if (sortBy === 'most_comments') {
        return (b.comment_count || 0) - (a.comment_count || 0);
      }
      if (sortBy === 'most_saves') {
        return (b.save_count || 0) - (a.save_count || 0);
      }
      return 0;
    });
  }, [posts, highlights, activeTab, sortBy, profile]);

  const toggleSelectAll = () => {
    const currentIds = displayedPosts.map((p) => p.id);
    const allSelected = currentIds.every((id) => selectedIds.has(id));

    const next = new Set(selectedIds);
    if (allSelected) {
      currentIds.forEach((id) => next.delete(id));
    } else {
      currentIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleSelectPost = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDownloadSingle = async (post: InstagramPost) => {
    try {
      setDownloadingSingleId(post.id);
      const mediaUrl = post.direct_media_url || post.thumbnail;
      const isAvatar = post.type === 'avatar';
      const safeTitle = isAvatar
        ? `avatar_${profile?.username || 'instagram'}`
        : (post.caption || `instagram_${post.id}`).slice(0, 30);
      await downloadCleanSingleMedia(mediaUrl, safeTitle, post.is_video, isAvatar);
    } catch (err: any) {
      alert(`Erro ao baixar: ${err.message}`);
    } finally {
      setDownloadingSingleId(null);
    }
  };

  const handleDownloadBatch = async () => {
    const selectedPosts = posts.filter((p) => selectedIds.has(p.id));
    if (selectedPosts.length === 0) return;

    try {
      setDownloadingZip(true);
      setZipProgress(0);

      const items = selectedPosts.map((p) => ({
        id: p.id,
        url: p.direct_media_url || p.thumbnail,
        title: p.type === 'avatar' ? `avatar_${profile?.username || 'instagram'}` : p.caption,
        isVideo: p.is_video,
        type: p.type,
      }));

      await downloadCleanBatchZip(items, profile?.username || 'instagram', (pct) => {
        setZipProgress(pct);
      });
    } catch (err: any) {
      alert(`Erro ao gerar ZIP: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div>
          <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Instagram className="w-4 h-4" />
            Downloads & Limpeza
          </div>
          <h1 className="text-2xl font-extrabold text-white">Baixar Perfil (Instagram)</h1>
          <p className="text-xs text-gray-400 mt-1">
            Extraia Fotos, Reels, Destaques e mídias em alta resolução com higienização de metadados anti-reutilização automática.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 px-3.5 py-1.5 rounded-full text-pink-400 text-xs font-semibold w-fit">
              <ShieldCheck className="w-4 h-4" />
              Limpeza Extrema Integrada: Mídias baixadas 100% virgens para o algoritmo
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cole o link ou @ do perfil do Instagram (ex: @famapizzariaoficial ou https://instagram.com/usuario)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition shadow-inner"
                />
              </div>

              <select
                value={maxPosts}
                onChange={(e) => setMaxPosts(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="0">Todos os posts (Perfil Completo)</option>
                <option value="12">Últimos 12 posts</option>
                <option value="24">Últimos 24 posts</option>
                <option value="50">Últimos 50 posts</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="py-3.5 px-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-pink-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Analisando Instagram...' : 'Analisar Perfil'}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2 text-xs text-rose-300">
              <div className="flex items-center gap-2.5 font-bold text-rose-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {error.includes('INICIAR_SISTEMA') && (
                <div className="pl-6 text-[11px] text-gray-400 space-y-1 pt-1 border-t border-rose-500/20">
                  <p className="font-semibold text-rose-200">
                    💡 Como resolver em 3 segundos:
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-gray-300">
                    <li>Abra a pasta do projeto no Windows.</li>
                    <li>Dê dois cliques no arquivo <code className="bg-gray-800 text-pink-400 px-1 py-0.5 rounded">INICIAR_SISTEMA.bat</code> (ou execute <code className="bg-gray-800 text-pink-400 px-1 py-0.5 rounded">python mediahub_runner.py</code>).</li>
                    <li>Acesse diretamente em <a href="http://localhost:3000/instagram" className="text-pink-400 underline font-semibold">http://localhost:3000/instagram</a> para extração 100% livre de bloqueios.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Profile Card & Bio Section */}
        {profile && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              {/* Avatar + Nick + Stats */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => {
                    const avatarPost = posts.find((p) => p.type === 'avatar');
                    if (avatarPost) handleDownloadSingle(avatarPost);
                  }}
                  className="relative group/avatar cursor-pointer"
                  title="Clique para baixar a Foto de Perfil HD (1080x1080)"
                >
                  <img
                    src={profile.avatar || posts[0]?.thumbnail || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop'}
                    alt={profile.nickname || 'Perfil'}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-pink-500/50 group-hover/avatar:ring-pink-400 transition shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-pink-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white border border-gray-900 group-hover/avatar:bg-pink-500 transition">
                    HD
                  </span>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition">
                    <Download className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {profile.nickname || profile.username || 'Perfil Instagram'}
                    <span className="text-xs text-gray-400 font-normal">@{profile.username || query}</span>
                  </h2>

                  {/* Followers & Count Stats */}
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>
                      <strong className="text-white">{profile.post_count || posts.length}</strong> publicações
                    </span>
                    <span>•</span>
                    {profile.follower_count ? (
                      <>
                        <span>
                          <strong className="text-white">{profile.follower_count}</strong> seguidores
                        </span>
                        <span>•</span>
                      </>
                    ) : null}
                    <span className="text-pink-400 font-semibold">
                      {selectedIds.size} de {posts.length} selecionadas
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={toggleSelectAll}
                  className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition flex items-center gap-2"
                >
                  {selectedIds.size === displayedPosts.length && displayedPosts.length > 0 ? (
                    <Square className="w-3.5 h-3.5" />
                  ) : (
                    <CheckSquare className="w-3.5 h-3.5" />
                  )}
                  {selectedIds.size === displayedPosts.length && displayedPosts.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>

                <button
                  onClick={handleDownloadBatch}
                  disabled={downloadingZip || selectedIds.size === 0}
                  className="py-2.5 px-5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {downloadingZip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando ZIP ({zipProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Baixar Selecionados ({selectedIds.size})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* BIO Card with 1-Click Copy Icon Preserving Exact Formatting */}
            {profile.signature && (
              <div className="bg-gray-950 border border-gray-800/90 rounded-2xl p-4 relative group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Biografia do Perfil
                  </span>
                  <button
                    onClick={handleCopyBio}
                    className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 rounded-lg text-xs font-medium transition active:scale-95"
                    title="Copiar biografia com formatação original"
                  >
                    {copiedBio ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Bio</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="whitespace-pre-wrap font-sans text-xs text-gray-300 leading-relaxed break-words">
                  {profile.signature}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Tabs & Sorting Filters Bar */}
        {posts.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-gray-800/80">
              {/* Category Tabs (Seçõezinhas) */}
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 scrollbar-thin">
                {/* 1. Todas as publicações */}
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'all'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Todas as publicações</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'all' ? 'bg-pink-800 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {counts.all}
                  </span>
                </button>

                {/* 2. Fotos */}
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'photos'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fotos (Feed)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'photos' ? 'bg-pink-800 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {counts.photos}
                  </span>
                </button>

                {/* 3. Reels */}
                <button
                  onClick={() => setActiveTab('reels')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                    activeTab === 'reels'
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                      : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-pink-400" />
                  <span>Reels</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'reels' ? 'bg-pink-800 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {counts.reels}
                  </span>
                </button>

                {/* 4. Foto de Perfil (HD) */}
                {counts.avatar > 0 && (
                  <button
                    onClick={() => setActiveTab('avatar')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTab === 'avatar'
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                        : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span>Foto de Perfil (HD)</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        activeTab === 'avatar' ? 'bg-pink-800 text-white' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {counts.avatar}
                    </span>
                  </button>
                )}

                {/* 5. Destaques dinâmicos com Capa Fixada e Contador de Stories */}
                {highlights.map((hl) => {
                  const isActive = activeTab === hl.id || activeTab === `highlight_${hl.highlight_id}`;
                  const hlStoriesCount =
                    posts.filter(
                      (p) =>
                        p.type === 'highlight' &&
                        (p.highlight_id === hl.highlight_id ||
                          p.id.includes(hl.highlight_id || '') ||
                          p.highlight_name === hl.title)
                    ).length ||
                    hl.story_count ||
                    1;

                  return (
                    <button
                      key={hl.id}
                      onClick={() => setActiveTab(hl.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                        isActive
                          ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-2 ring-pink-400'
                          : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
                      }`}
                    >
                      <img
                        src={hl.cover || profile?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop'}
                        alt={hl.title}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-pink-400/80 flex-shrink-0"
                      />
                      <span>Destaque: {hl.title}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-pink-800 text-white' : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {hlStoriesCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sorting Filter Dropdown */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[11px] text-gray-400 font-semibold hidden sm:inline">Ordenar:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="recent_to_old" className="bg-gray-900 text-white">
                      Mais recente &gt; antiga
                    </option>
                    <option value="oldest_to_recent" className="bg-gray-900 text-white">
                      Mais antiga &gt; recente
                    </option>
                    <option value="most_likes" className="bg-gray-900 text-white">
                      Mais curtidas
                    </option>
                    <option value="most_views" className="bg-gray-900 text-white">
                      Mais visualizações
                    </option>
                    <option value="most_comments" className="bg-gray-900 text-white">
                      Mais comentários
                    </option>
                    <option value="most_saves" className="bg-gray-900 text-white">
                      Mais salvos
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content Display Info */}
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>
                Exibindo <strong className="text-white">{displayedPosts.length}</strong> itens ordenados por{' '}
                <span className="text-pink-400 font-medium">
                  {sortBy === 'recent_to_old' && 'Mais recente > antiga'}
                  {sortBy === 'oldest_to_recent' && 'Mais antiga > recente'}
                  {sortBy === 'most_likes' && 'Mais curtidas'}
                  {sortBy === 'most_views' && 'Mais visualizações'}
                  {sortBy === 'most_comments' && 'Mais comentários'}
                  {sortBy === 'most_saves' && 'Mais salvos'}
                </span>
              </span>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedPosts.map((post) => {
                const isSelected = selectedIds.has(post.id);
                const isDownloadingThis = downloadingSingleId === post.id;

                return (
                  <div
                    key={post.id}
                    onClick={() => toggleSelectPost(post.id)}
                    className={`bg-gray-900 border rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between group ${
                      isSelected
                        ? 'border-pink-500 ring-2 ring-pink-500/30'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-950 overflow-hidden">
                      <img
                        src={post.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop'}
                        alt={post.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm p-1.5 rounded-lg text-white">
                        {post.is_video ? (
                          <Film className="w-3.5 h-3.5 text-pink-400" />
                        ) : post.type === 'highlight' ? (
                          <Sparkle className="w-3.5 h-3.5 text-amber-400" />
                        ) : post.type === 'avatar' ? (
                          <User className="w-3.5 h-3.5 text-purple-400" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </div>

                      <div className="absolute top-2 right-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition shadow-md ${
                            isSelected ? 'bg-pink-600 text-white' : 'bg-black/60 border border-white/40'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                        {post.caption || 'Sem legenda'}
                      </p>

                      <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-gray-400 text-[10px] truncate max-w-[80px]">
                          {post.type === 'avatar' ? 'Avatar HD' : post.id}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSingle(post);
                            }}
                            disabled={isDownloadingThis}
                            className="text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                          >
                            {isDownloadingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            Baixar Limpo
                          </button>

                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-400 hover:text-white p-1"
                              title="Abrir no Instagram"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
