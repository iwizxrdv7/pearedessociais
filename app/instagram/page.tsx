'use client';

import React, { useState } from 'react';
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
  Loader2
} from 'lucide-react';
import { downloadCleanSingleMedia, downloadCleanBatchZip } from '@/lib/media_downloader';
import { fetchInstagramProfile } from '@/lib/scraper_client';

interface InstagramPost {
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

interface ProfileInfo {
  username: string;
  nickname: string;
  avatar: string;
  signature: string;
  follower_count: number;
  video_count: number;
}

export default function InstagramDownloaderPage() {
  const [query, setQuery] = useState('');
  const [maxPosts, setMaxPosts] = useState('0');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

    try {
      const data = await fetchInstagramProfile(query.trim(), Number(maxPosts));

      if (data.user_info) {
        setProfile(data.user_info as any);
      }

      const fetchedPosts: InstagramPost[] = (data.posts || []) as any;
      const finalPosts = Number(maxPosts) > 0 ? fetchedPosts.slice(0, Number(maxPosts)) : fetchedPosts;
      if (finalPosts.length === 0) {
        throw new Error('Nenhuma publicação encontrada para este perfil.');
      }

      setPosts(finalPosts);
      setSelectedIds(new Set(finalPosts.map((p) => p.id)));
      setSuccessMsg(`Encontrados ${finalPosts.length} posts/reels de alta qualidade!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
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
      const safeTitle = (post.caption || `instagram_${post.id}`).slice(0, 30);
      await downloadCleanSingleMedia(mediaUrl, safeTitle, post.is_video);
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
        title: p.caption,
        isVideo: p.is_video,
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
            Extraia Reels, vídeos e fotos em alta resolução com limpeza de metadados anti-reutilização automática.
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
                className="bg-gray-950 border border-gray-800 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-pink-500"
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
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Profile Card & Posts Grid */}
        {posts.length > 0 && (
          <div className="space-y-6">
            {/* Profile Header & Actions */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={profile?.avatar || posts[0]?.thumbnail || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop'}
                  alt={profile?.nickname || 'Perfil'}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-pink-500/40"
                />
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {profile?.nickname || profile?.username || 'Perfil Instagram'}
                    <span className="text-xs text-gray-400 font-normal">@{profile?.username || query}</span>
                  </h2>
                  <p className="text-xs text-gray-300 mt-1 max-w-lg line-clamp-2">
                    {profile?.signature || 'Publicações e Reels disponíveis para download'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>
                      <strong className="text-white">{posts.length}</strong> publicações carregadas
                    </span>
                    <span>•</span>
                    <span className="text-pink-400 font-semibold">
                      {selectedIds.size} selecionadas
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
                  {selectedIds.size === posts.length ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
                  {selectedIds.size === posts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
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

            {/* Posts Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post) => {
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
                        {post.is_video ? <Film className="w-3.5 h-3.5 text-pink-400" /> : <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />}
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
                          {post.id}
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
