'use client';

import React, { useState } from 'react';
import { VideoPost, SocialAccount } from '@/lib/types';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Instagram,
  Facebook,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar as CalendarIcon
} from 'lucide-react';

interface CalendarViewProps {
  posts: VideoPost[];
  accounts: SocialAccount[];
  selectedAccountId?: string;
  loading?: boolean;
}

export function CalendarView({ posts, accounts, selectedAccountId, loading = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Filtrar posts do perfil se selecionado
  const filteredPosts = selectedAccountId
    ? posts.filter((p) => p.account_id === selectedAccountId)
    : posts;

  // Gerar dias da semana atual
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Segunda-feira
  startOfWeek.setDate(diff);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    return day;
  });

  const nextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const getPostDateStr = (p: VideoPost) => {
    const raw = p.scheduled_for || p.published_at || p.created_at;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw.split('T')[0] || '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayNum = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Grade Semanal de Agendamento</h2>
            <p className="text-xs text-gray-400">Distribuição visual das postagens programadas e publicadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold rounded-xl transition"
            title="Ir para a semana atual"
          >
            Hoje
          </button>
          <button
            onClick={prevWeek}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-gray-200 px-3 py-1.5 bg-gray-950 rounded-xl border border-gray-800">
            {weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} —{' '}
            {weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </span>
          <button
            onClick={nextWeek}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition"
            title="Próxima semana"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2.5">
        {weekDays.map((day, idx) => {
          const y = day.getFullYear();
          const m = String(day.getMonth() + 1).padStart(2, '0');
          const d = String(day.getDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;

          const todayObj = new Date();
          const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
          const isToday = todayStr === dateStr;

          // Posts deste dia (seja agendado ou já publicado)
          const dayPosts = filteredPosts.filter((p) => getPostDateStr(p) === dateStr);

          return (
            <div
              key={idx}
              className={`rounded-2xl p-2.5 h-[500px] flex flex-col justify-between border transition-all ${
                isToday
                  ? 'bg-indigo-950/30 border-indigo-500/60 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50'
                  : 'bg-gray-950/60 border-gray-800/80 hover:border-gray-700'
              }`}
            >
              <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-xs flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold ${isToday ? 'text-indigo-300' : 'text-gray-400'}`}>
                      {dayNames[idx]}
                    </span>
                    {isToday && (
                      <span className="text-[7.5px] bg-indigo-500/30 text-indigo-300 font-extrabold px-1 py-0.5 rounded uppercase tracking-wider">
                        Hoje
                      </span>
                    )}
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40' : 'text-gray-300 bg-gray-900'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Posts List with Independent Scrollbar */}
                <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
                  {loading ? (
                    // Skeleton Silhouettes
                    <div className="space-y-2 animate-pulse pt-1">
                      <div className="bg-gray-900/60 border border-gray-800/60 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-2.5 bg-gray-800 rounded"></div>
                          <div className="w-14 h-3 bg-gray-800/80 rounded"></div>
                        </div>
                        <div className="w-full h-3 bg-gray-800/90 rounded"></div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="w-8 h-2 bg-gray-800/60 rounded"></div>
                          <div className="w-12 h-2 bg-gray-800/60 rounded"></div>
                        </div>
                      </div>
                      {(idx % 2 === 0 || isToday) && (
                        <div className="bg-gray-900/40 border border-gray-800/40 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="w-10 h-2.5 bg-gray-800/70 rounded"></div>
                            <div className="w-12 h-3 bg-gray-800/60 rounded"></div>
                          </div>
                          <div className="w-4/5 h-3 bg-gray-800/70 rounded"></div>
                          <div className="flex items-center justify-between pt-1">
                            <div className="w-8 h-2 bg-gray-800/50 rounded"></div>
                            <div className="w-10 h-2 bg-gray-800/50 rounded"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : dayPosts.length === 0 ? (
                    <div className="text-[10px] text-gray-600 text-center py-12 flex flex-col items-center justify-center">
                      <span>Sem posts</span>
                    </div>
                  ) : (
                    dayPosts.map((post) => {
                      const postTime = (() => {
                        const raw = post.scheduled_for || post.published_at || post.created_at;
                        if (!raw) return '18:00';
                        const pDate = new Date(raw);
                        if (isNaN(pDate.getTime())) return raw.split('T')[1]?.substring(0, 5) || '18:00';
                        return pDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      })();

                      return (
                        <div
                          key={post.id}
                          className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-indigo-500/40 rounded-xl p-2 text-xs transition cursor-pointer shadow-sm group"
                        >
                          <div className="flex items-center justify-between mb-1.5 gap-1">
                            <span className="text-[10px] font-mono font-bold text-indigo-400 flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {postTime}
                            </span>

                            {post.status === 'published' ? (
                              <span className="text-[8.5px] leading-none bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-1 rounded-md font-semibold flex items-center gap-0.5 flex-shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Publicado</span>
                              </span>
                            ) : post.status === 'scheduled' ? (
                              <span className="text-[8.5px] leading-none bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-1.5 py-1 rounded-md font-medium flex items-center gap-0.5 flex-shrink-0">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Agendado</span>
                              </span>
                            ) : post.status === 'processing' ? (
                              <span className="text-[8.5px] leading-none bg-amber-500/15 text-amber-400 border border-amber-500/30 px-1.5 py-1 rounded-md font-medium flex items-center gap-0.5 flex-shrink-0">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                <span>Postando</span>
                              </span>
                            ) : (
                              <span className="text-[8.5px] leading-none bg-rose-500/15 text-rose-400 border border-rose-500/30 px-1.5 py-1 rounded-md font-medium flex items-center gap-0.5 flex-shrink-0">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>Falhou</span>
                              </span>
                            )}
                          </div>

                          <div className="font-medium text-white truncate text-[11px] group-hover:text-indigo-300 transition" title={post.title}>
                            {post.title}
                          </div>

                          <div className="flex items-center justify-between mt-1 text-gray-500 text-[10px]">
                            <div className="flex items-center gap-1">
                              {post.meta_media_id ? (
                                <Instagram className="w-3 h-3 text-pink-400" />
                              ) : (
                                <Instagram className="w-3 h-3 text-gray-600" />
                              )}
                              {post.meta_video_id ? (
                                <Facebook className="w-3 h-3 text-blue-400" />
                              ) : (
                                <Facebook className="w-3 h-3 text-gray-600" />
                              )}
                            </div>
                            <span className="text-[9px] truncate max-w-[70px]">{post.account_name}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Day summary count */}
              <div className="pt-2 mt-2 text-[10px] text-gray-500 font-medium text-center border-t border-gray-800/60 flex-shrink-0">
                {loading ? (
                  <span className="inline-block w-10 h-2.5 bg-gray-800/60 rounded animate-pulse"></span>
                ) : (
                  `${dayPosts.length} post(s)`
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
