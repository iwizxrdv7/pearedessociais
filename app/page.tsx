'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CalendarView } from '@/components/CalendarView';
import { SocialAccount, VideoPost, DashboardStats } from '@/lib/types';
import { useAccount } from '@/context/AccountContext';
import {
  Sparkles,
  Users2,
  Calendar,
  Layers,
  Send,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Instagram,
  Facebook,
  Zap,
  ShieldCheck,
  PlusCircle
} from 'lucide-react';

export default function DashboardPage() {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    reloadAccounts,
  } = useAccount();
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      try {
        await fetch('/api/cron');
      } catch (e) {}

      const postRes = await fetch('/api/posts');
      const postData = await postRes.json();
      if (Array.isArray(postData)) {
        setPosts(postData);

        // Se houver algum post em processamento na Meta, verificar e atualizar automaticamente
        const processingPost = postData.find((p: VideoPost) => p.status === 'processing');
        if (processingPost) {
          fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: processingPost.id }),
          })
            .then((r) => r.json())
            .then((updated) => {
              if (updated?.post && updated.status !== 'processing') {
                setPosts((prev) => prev.map((p) => (p.id === updated.post.id ? updated.post : p)));
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const stats: DashboardStats = {
    total_accounts: accounts.length,
    active_accounts: accounts.filter((a) => a.status === 'active').length,
    scheduled_posts: posts.filter((p) => p.status === 'scheduled').length,
    published_today: posts.filter((p) => p.status === 'published').length,
    total_published: posts.filter((p) => p.status === 'published').length,
    failed_posts: posts.filter((p) => p.status === 'failed').length,
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />

      <div className="p-4 md:p-6 lg:p-8 max-w-[98%] w-full mx-auto space-y-6">
        {/* Onboarding Banner when no accounts */}
        {accounts.length === 0 && !loading && (
          <div className="bg-[#111726] border border-indigo-500/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Nenhum perfil conectado ainda</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Conecte sua primeira página do Facebook ou conta do Instagram para começar a postar e agendar Reels automaticamente.
                </p>
              </div>
            </div>
            <Link
              href="/contas"
              className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/25 transition flex items-center gap-2 flex-shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Conectar Primeiro Perfil
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111726] border border-gray-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-xs text-gray-400 font-medium">Perfis Conectados</span>
              <div className={`text-2xl font-extrabold text-white mt-1 transition-all duration-300 ${loading ? 'filter blur-[4px] opacity-40 select-none animate-pulse' : ''}`}>
                {loading ? '—' : stats.total_accounts}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                {loading ? (
                  <span className="w-20 h-2.5 bg-emerald-500/20 rounded animate-pulse inline-block"></span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> {stats.active_accounts} ativos via API
                  </>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <Users2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-[#111726] border border-gray-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-xs text-gray-400 font-medium">Reels Agendados</span>
              <div className={`text-2xl font-extrabold text-white mt-1 transition-all duration-300 ${loading ? 'filter blur-[4px] opacity-40 select-none animate-pulse' : ''}`}>
                {loading ? '—' : stats.scheduled_posts}
              </div>
              <div className="text-[11px] text-indigo-400 flex items-center gap-1 mt-1">
                {loading ? (
                  <span className="w-24 h-2.5 bg-indigo-500/20 rounded animate-pulse inline-block"></span>
                ) : (
                  <>
                    <Clock className="w-3 h-3" /> Prontos para disparo
                  </>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-xs text-gray-400 font-medium">Total Publicados</span>
              <div className={`text-2xl font-extrabold text-white mt-1 transition-all duration-300 ${loading ? 'filter blur-[4px] opacity-40 select-none animate-pulse' : ''}`}>
                {loading ? '—' : stats.total_published}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                {loading ? (
                  <span className="w-20 h-2.5 bg-emerald-500/20 rounded animate-pulse inline-block"></span>
                ) : (
                  <>
                    <TrendingUp className="w-3 h-3" /> 100% via API Meta
                  </>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Send className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-xs text-gray-400 font-medium">Meta API Health</span>
              <div className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                Operacional
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Token Permanente
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Calendar Schedule Grid - Full width */}
        <CalendarView
          posts={posts}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          loading={loading}
        />
      </div>
    </main>
  );
}
