'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { VideoUploadZone } from '@/components/VideoUploadZone';
import { CalendarView } from '@/components/CalendarView';
import { SocialAccount, VideoPost, DashboardStats } from '@/lib/types';
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
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<VideoPost[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats: DashboardStats = {
    total_accounts: accounts.length,
    active_accounts: accounts.filter((a) => a.status === 'active').length,
    scheduled_posts: posts.filter((p) => p.status === 'scheduled').length,
    published_today: posts.filter((p) => p.status === 'published').length,
    total_published: posts.filter((p) => p.status === 'published').length,
    failed_posts: posts.filter((p) => p.status === 'failed').length,
  };

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Hero Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-gray-900 border border-indigo-500/20 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-400 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Painel P&A Redes Sociais — Ativo
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Postador & Agendador Inteligente
              </h1>
              <p className="text-sm text-gray-300 mt-2 max-w-xl leading-relaxed">
                Gerencie múltiplos perfis, publique Reels em massa diretamente pela Meta Graph API sem navegador e sem bloqueios.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/contas"
                className="py-3 px-5 bg-gray-900/80 hover:bg-gray-800 text-white font-semibold text-xs rounded-2xl border border-gray-700 transition flex items-center gap-2 shadow-sm"
              >
                <Users2 className="w-4 h-4 text-indigo-400" />
                Gerenciar Perfis ({accounts.length})
              </Link>
              <Link
                href="/fila"
                className="py-3 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Subir Vídeos
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Perfis Conectados</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {stats.total_accounts}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> {stats.active_accounts} ativos via API
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Reels Agendados</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {stats.scheduled_posts}
              </div>
              <div className="text-[11px] text-indigo-400 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" /> Prontos para disparo
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Total Publicados</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                {stats.total_published}
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> 100% via API Meta
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Send className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-5 rounded-3xl shadow-lg flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium">Meta API Health</span>
              <div className="text-base font-bold text-white mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                Operacional
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Token Permanente
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Upload and Schedule Section */}
        <VideoUploadZone
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onPostCreated={fetchData}
        />

        {/* Calendar Schedule Grid */}
        <CalendarView
          posts={posts}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
        />
      </div>
    </main>
  );
}
