'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { VideoUploadZone } from '@/components/VideoUploadZone';
import { SocialAccount, VideoPost } from '@/lib/types';
import {
  Layers,
  Clock,
  Send,
  Trash2,
  Film,
  Instagram,
  Facebook,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles
} from 'lucide-react';

export default function FilaPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [accRes, postRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/posts'),
      ]);
      const accData = await accRes.json();
      const postData = await postRes.json();

      if (Array.isArray(accData)) {
        setAccounts(accData);
        if (!selectedAccountId && accData.length > 0) {
          setSelectedAccountId(accData[0].id);
        }
      }
      if (Array.isArray(postData)) {
        setPosts(postData);
      }
    } catch (err) {
      console.error('Erro ao buscar fila:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePublishNow = async (postId: string) => {
    setPublishingId(postId);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert(`Erro ao publicar: ${data.post?.error_message || 'Falha na API'}`);
      }
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setPublishingId(null);
    }
  };

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

  const queuePosts = posts.filter((p) => p.status === 'queued' || p.status === 'scheduled');
  const filteredQueue = selectedAccountId
    ? queuePosts.filter((p) => p.account_id === selectedAccountId)
    : queuePosts;

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              Fila de Processamento & Upload
            </div>
            <h1 className="text-2xl font-extrabold text-white">Fila de Vídeos Para Postar</h1>
            <p className="text-xs text-gray-400 mt-1">
              Faça upload em lote de vídeos e organize sua grade de publicações no Instagram e Facebook.
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <VideoUploadZone
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onPostCreated={fetchData}
        />

        {/* Queue List */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Vídeos Aguardando Disparo ({filteredQueue.length})
              </h3>
              <p className="text-xs text-gray-400">
                Vídeos na fila prontos para publicação automática
              </p>
            </div>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              Nenhum vídeo na fila no momento. Arraste novos vídeos na caixa acima para agendar!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQueue.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{post.title}</h4>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded">
                          {post.file_size_mb} MB
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{post.caption || 'Sem legenda'}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                        <span className="text-indigo-300 font-medium">{post.account_name}</span>
                        {post.scheduled_for && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            Agendado para: {new Date(post.scheduled_for).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      disabled={publishingId === post.id}
                      className="py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {publishingId === post.id ? 'Publicando...' : 'Publicar Agora'}
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-xl transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
