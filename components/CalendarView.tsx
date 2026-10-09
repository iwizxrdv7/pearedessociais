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
  Calendar as CalendarIcon
} from 'lucide-react';

interface CalendarViewProps {
  posts: VideoPost[];
  accounts: SocialAccount[];
  selectedAccountId?: string;
}

export function CalendarView({ posts, accounts, selectedAccountId }: CalendarViewProps) {
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
            <p className="text-xs text-gray-400">Distribuição visual das postagens programadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition"
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
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day, idx) => {
          const dateStr = day.toISOString().split('T')[0];
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          
          // Posts deste dia
          const dayPosts = filteredPosts.filter((p) => {
            if (!p.scheduled_for) return false;
            return p.scheduled_for.startsWith(dateStr);
          });

          return (
            <div
              key={idx}
              className={`rounded-2xl p-3 min-h-[280px] flex flex-col justify-between border transition-all ${
                isToday
                  ? 'bg-indigo-950/20 border-indigo-500/40 ring-1 ring-indigo-500/30'
                  : 'bg-gray-950/60 border-gray-800/80'
              }`}
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-xs">
                  <span className={`font-bold ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>
                    {dayNames[idx]}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 bg-gray-900'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Posts List */}
                <div className="space-y-2">
                  {dayPosts.length === 0 ? (
                    <div className="text-[10px] text-gray-600 text-center py-6">
                      Sem posts
                    </div>
                  ) : (
                    dayPosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-indigo-500/40 rounded-xl p-2 text-xs transition cursor-pointer shadow-sm group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-semibold text-indigo-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {post.scheduled_for?.split('T')[1]?.substring(0, 5) || '18:00'}
                          </span>
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-medium">
                            Agendado
                          </span>
                        </div>
                        <div className="font-medium text-white truncate text-[11px] group-hover:text-indigo-300 transition">
                          {post.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
                          <Instagram className="w-3 h-3 text-pink-400" />
                          <Facebook className="w-3 h-3 text-blue-400" />
                          <span className="text-[9px] truncate">{post.account_name}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Day summary count */}
              <div className="pt-2 text-[10px] text-gray-500 font-medium text-center border-t border-gray-800/60">
                {dayPosts.length} post(s)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
