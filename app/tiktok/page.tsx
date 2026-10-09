'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import {
  Film,
  Search,
  Download,
  Sparkles,
  ShieldCheck,
  Eye,
  Heart,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ExternalLink,
  PlusCircle
} from 'lucide-react';

interface TikTokVideo {
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

interface ProfileInfo {
  username: string;
  nickname: string;
  avatar: string;
  signature: string;
  follower_count: number;
  video_count: number;
}

export default function TikTokDownloaderPage() {
  const [query, setQuery] = useState('');
  const [maxVideos, setMaxVideos] = useState('0'); // 0 = Todos
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setProfile(null);
    setVideos([]);

    try {
      const res = await fetch('/api/tiktok/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query.trim(), max_items: Number(maxVideos) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar perfil.');

      setProfile(data.data.user_info);
      const fetchedVideos: TikTokVideo[] = data.data.videos || [];
      setVideos(fetchedVideos);
      setSelectedIds(new Set(fetchedVideos.map((v) => v.id)));
      setSuccessMsg(`Encontrados ${fetchedVideos.length} vídeos públicos sem marca d'água!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map((v) => v.id)));
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
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Film className="w-4 h-4" />
            Downloads & Limpeza
          </div>
          <h1 className="text-2xl font-extrabold text-white">Baixar Perfil Completo (TikTok)</h1>
          <p className="text-xs text-gray-400 mt-1">
            Faça download em massa de vídeos sem marca d'água inserindo o link do perfil ou @usuario.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-indigo-400 text-xs font-semibold w-fit">
              <ShieldCheck className="w-4 h-4" />
              Limpeza Extrema Integrada: Vídeos gerados como NOVOS para os algoritmos
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cole o link ou @ do perfil do TikTok (ex: @usuario ou https://tiktok.com/@usuario)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
                />
              </div>

              <select
                value={maxVideos}
                onChange={(e) => setMaxVideos(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-2xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="0">Todos os vídeos (Perfil Completo)</option>
                <option value="10">Últimos 10 vídeos</option>
                <option value="25">Últimos 25 vídeos</option>
                <option value="50">Últimos 50 vídeos</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? 'Analisando Perfil...' : 'Analisar e Listar Vídeos'}
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

        {/* Profile Card & Videos Grid */}
        {profile && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={profile.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop'}
                  alt={profile.nickname}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/40"
                />
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {profile.nickname}
                    <span className="text-xs text-gray-400 font-normal">@{profile.username}</span>
                  </h2>
                  <p className="text-xs text-gray-300 mt-1 max-w-lg line-clamp-2">{profile.signature || 'Sem bio informada'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>
                      <strong className="text-white">{profile.follower_count?.toLocaleString() || 0}</strong> seguidores
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-white">{videos.length}</strong> vídeos carregados
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition"
                >
                  {selectedIds.size === videos.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <a
                  href={`http://127.0.0.1:8000/api/tiktok/analyze`}
                  target="_blank"
                  className="py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar Selecionados ({selectedIds.size})
                </a>
              </div>
            </div>

            {/* Videos Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((vid) => {
                const isSelected = selectedIds.has(vid.id);
                return (
                  <div
                    key={vid.id}
                    onClick={() => toggleSelectVideo(vid.id)}
                    className={`bg-gray-900 border rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col justify-between group ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="relative aspect-[9/16] bg-gray-950 overflow-hidden">
                      <img
                        src={vid.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=700&fit=crop'}
                        alt={vid.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                      {/* Selection Badge */}
                      <div className="absolute top-2.5 right-2.5">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                            isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-black/60 border border-white/40'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      {/* Video Stats */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white font-medium">
                        <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                          <Eye className="w-3 h-3 text-indigo-400" />
                          {vid.view_count?.toLocaleString() || '—'}
                        </span>
                        {vid.like_count ? (
                          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            <Heart className="w-3 h-3 text-pink-400" />
                            {vid.like_count?.toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="text-xs text-gray-200 line-clamp-2 font-medium leading-relaxed">
                        {vid.title || 'Vídeo sem legenda'}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="font-mono">{vid.id}</span>
                        {vid.direct_video_url && (
                          <a
                            href={vid.direct_video_url}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
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
