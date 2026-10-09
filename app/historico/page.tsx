'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SocialAccount, VideoPost } from '@/lib/types';
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
  Sparkles
} from 'lucide-react';

export default function HistoricoPage() {
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

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

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
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
        </div>

        {/* History Table / List */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              Nenhuma postagem registrada no histórico ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-950 border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-indigo-400 flex-shrink-0">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{post.title}</h4>
                        {post.status === 'published' && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Publicado
                          </span>
                        )}
                        {post.status === 'scheduled' && (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Agendado
                          </span>
                        )}
                        {post.status === 'failed' && (
                          <span className="text-[10px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Falhou
                          </span>
                        )}
                        {post.status === 'queued' && (
                          <span className="text-[10px] bg-gray-800 text-gray-300 font-semibold px-2 py-0.5 rounded-full">
                            Na Fila
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{post.caption || 'Sem legenda'}</p>
                      
                      {post.error_message && (
                        <p className="text-xs text-rose-400 mt-1 font-mono">{post.error_message}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                        <span className="text-indigo-400 font-medium">{post.account_name}</span>
                        {post.published_at && (
                          <span>Publicado em: {new Date(post.published_at).toLocaleString('pt-BR')}</span>
                        )}
                        {post.meta_video_id && (
                          <span className="font-mono">Facebook ID: {post.meta_video_id}</span>
                        )}
                        {post.meta_media_id && (
                          <span className="font-mono">Instagram ID: {post.meta_media_id}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-gray-800 rounded-xl transition self-end md:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
