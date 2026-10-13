'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CalendarView } from '@/components/CalendarView';
import { SocialAccount, VideoPost } from '@/lib/types';
import { useAccount } from '@/context/AccountContext';
import { Calendar, Clock, Sparkles, Filter, Instagram, Facebook } from 'lucide-react';

export default function CalendarioPage() {
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
  } = useAccount();
  const [posts, setPosts] = useState<VideoPost[]>([]);

  const fetchPosts = async () => {
    try {
      try {
        await fetch('/api/cron');
      } catch (e) {}

      const postRes = await fetch('/api/posts');
      const postData = await postRes.json();
      if (Array.isArray(postData)) {
        setPosts(postData);
      }
    } catch (err) {
      console.error('Erro ao buscar dados do calendário:', err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Calendar className="w-4 h-4" />
              Programação & Planejamento
            </div>
            <h1 className="text-2xl font-extrabold text-white">Calendário de Postagens</h1>
            <p className="text-xs text-gray-400 mt-1">
              Acompanhe visualmente a grade de Reels programados para todos os seus perfis.
            </p>
          </div>
        </div>

        {/* Calendar View Component */}
        <CalendarView
          posts={posts}
          accounts={accounts}
          selectedAccountId={selectedAccountId}
        />
      </div>
    </main>
  );
}
