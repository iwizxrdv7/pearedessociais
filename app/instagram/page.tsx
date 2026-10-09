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
  Image as ImageIcon
} from 'lucide-react';

interface InstagramPost {
  id: string;
  url: string;
  thumbnail: string;
  caption: string;
  is_video: boolean;
  like_count?: number;
  comment_count?: number;
  direct_media_url?: string;
}

export default function InstagramDownloaderPage() {
  const [query, setQuery] = useState('');
  const [maxPosts, setMaxPosts] = useState('0');
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setPosts([]);

    try {
      const res = await fetch('/api/instagram/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query.trim(), max_items: Number(maxPosts) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar perfil do Instagram.');

      const fetchedPosts: InstagramPost[] = data.data.posts || [];
      setPosts(fetchedPosts);
      setSelectedIds(new Set(fetchedPosts.map((p) => p.id)));
      setSuccessMsg(`Encontrados ${fetchedPosts.length} posts/reels de alta qualidade!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectVideo = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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
            Extraia Reels, vídeos e fotos de qualquer perfil do Instagram em alta resolução.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cole o link ou @ do perfil do Instagram (ex: @usuario ou https://instagram.com/usuario)..."
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

        {/* Posts Grid */}
        {posts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{posts.length} publicações encontradas</span>
              <span className="font-semibold text-pink-400">{selectedIds.size} selecionadas</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post) => {
                const isSelected = selectedIds.has(post.id);
                return (
                  <div
                    key={post.id}
                    onClick={() => toggleSelectVideo(post.id)}
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
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg text-white">
                        {post.is_video ? <Film className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="absolute top-2 right-2">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                            isSelected ? 'bg-pink-600 text-white shadow-md' : 'bg-black/60 border border-white/40'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                        {post.caption || 'Sem legenda'}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-mono">{post.id}</span>
                        {post.direct_media_url && (
                          <a
                            href={post.direct_media_url}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir
                          </a>
                        )}
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
