'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SocialAccount, VideoPost } from '@/lib/types';
import { useAccount } from '@/context/AccountContext';
import {
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Instagram,
  Facebook,
  Trash2,
  Film,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function HistoricoPage() {
  const { selectedAccountId, setSelectedAccountId } = useAccount();
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPosts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const filteredPosts = selectedAccountId
    ? posts.filter((p) => p.account_id === selectedAccountId)
    : posts;

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / itemsPerPage));

  // Reset to first page if account filter changes or current page exceeds total
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccountId]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} showUploadButton={false} />

      <div className="p-4 md:p-6 lg:p-8 max-w-[98%] w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <History className="w-4 h-4" />
              Logs & Auditoria de Postagens
            </div>
            <h1 className="text-2xl font-extrabold text-white">Histórico de Publicações</h1>
            <p className="text-xs text-gray-400 mt-1">
              Acompanhe o status de todos os vídeos processados, publicados e agendados pela Meta API.
            </p>
          </div>

          <div className="text-xs text-gray-400 bg-gray-900 border border-gray-800 px-3.5 py-1.5 rounded-xl font-medium">
            Total de postagens: <span className="text-indigo-400 font-bold">{filteredPosts.length}</span>
          </div>
        </div>

        {/* History Container */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
          {filteredPosts.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-xs">
              Nenhuma postagem registrada no histórico ainda.
            </div>
          ) : (
            <>
              {/* 2-Column Side-by-Side Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                {paginatedPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-950/80 hover:bg-gray-950 border border-gray-800/80 hover:border-gray-700/80 rounded-2xl p-4 flex items-center justify-between gap-3.5 transition group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-indigo-400 flex-shrink-0 group-hover:scale-105 transition">
                        <Film className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-[360px]" title={post.title}>
                            {post.title}
                          </h4>
                          {post.status === 'published' && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> Publicado
                            </span>
                          )}
                          {post.status === 'scheduled' && (
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" /> Agendado
                            </span>
                          )}
                          {post.status === 'failed' && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                              <AlertCircle className="w-3 h-3" /> Falhou
                            </span>
                          )}
                          {post.status === 'queued' && (
                            <span className="text-[10px] bg-gray-800 text-gray-300 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                              Na Fila
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 truncate mt-1">{post.caption || 'Sem legenda'}</p>
                        
                        {post.error_message && (
                          <p className="text-xs text-rose-400 mt-1 font-mono truncate">{post.error_message}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] text-gray-400">
                          <span className="text-indigo-400 font-semibold truncate max-w-[150px]">{post.account_name}</span>
                          {post.published_at && (
                            <span className="text-gray-500">• {new Date(post.published_at).toLocaleString('pt-BR')}</span>
                          )}
                          {post.meta_video_id && (
                            <a
                              href={`https://www.facebook.com/reel/${post.meta_video_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 transition font-medium"
                            >
                              <Facebook className="w-3 h-3" />
                              Facebook
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {post.meta_media_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-600/10 text-pink-400 border border-pink-500/20 font-medium">
                              <Instagram className="w-3 h-3" />
                              Instagram
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePost(post.id)}
                      title="Excluir postagem do histórico"
                      className="p-2 text-gray-500 hover:text-rose-400 hover:bg-gray-800 rounded-xl transition flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-800/80">
                  <div className="text-xs text-gray-400">
                    Mostrando <span className="font-semibold text-white">{startIndex + 1}</span> a{' '}
                    <span className="font-semibold text-white">{Math.min(startIndex + itemsPerPage, filteredPosts.length)}</span> de{' '}
                    <span className="font-semibold text-white">{filteredPosts.length}</span> postagens
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>

                    <div className="px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs font-semibold text-indigo-400">
                      Página {currentPage} de {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs font-medium text-gray-300 hover:bg-gray-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
