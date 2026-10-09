'use client';

import React from 'react';
import { SocialAccount } from '@/lib/types';
import {
  Instagram,
  Facebook,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface AccountCardProps {
  account: SocialAccount;
  onSync: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AccountCard({ account, onSync, onDelete }: AccountCardProps) {
  const isInstagramLinked = !!account.instagram_account_id;

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-6 transition-all duration-200 shadow-lg flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={account.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop'}
                alt={account.name}
                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-gray-700"
              />
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-gray-900 ${
                  account.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              >
                {account.status === 'active' ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                ) : (
                  <AlertCircle className="w-2.5 h-2.5 text-white" />
                )}
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">{account.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                {account.instagram_username && (
                  <span className="text-xs text-indigo-400 font-medium">@{account.instagram_username}</span>
                )}
                {account.facebook_page_name && (
                  <span className="text-[11px] text-gray-400">({account.facebook_page_name})</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onSync(account.id)}
              title="Sincronizar dados da Meta API"
              className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(account.id)}
              title="Remover perfil"
              className="p-2 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Connectivity Status Grid */}
        <div className="space-y-2.5 my-4 bg-gray-950/60 p-3.5 rounded-xl border border-gray-800/80">
          {/* Facebook */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Facebook className="w-4 h-4 text-blue-500" />
              <span>Facebook Page</span>
            </div>
            {account.facebook_page_id ? (
              <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectada
              </span>
            ) : (
              <span className="text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">Não vinculada</span>
            )}
          </div>

          {/* Instagram */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <Instagram className="w-4 h-4 text-pink-500" />
              <span>Instagram Reels</span>
            </div>
            {isInstagramLinked ? (
              <span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Conectado
              </span>
            ) : (
              <span className="text-[11px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Vincular no FB
              </span>
            )}
          </div>
        </div>

        {/* Schedule Times */}
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Horários Automáticos da Grade:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {account.schedule_times && account.schedule_times.length > 0 ? (
              account.schedule_times.map((time) => (
                <span
                  key={time}
                  className="text-xs bg-gray-800 text-indigo-300 px-2.5 py-0.5 rounded-md font-mono border border-gray-700"
                >
                  {time}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">Nenhum horário definido</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" /> Token Permanente
        </span>
        <span>Meta API v20.0</span>
      </div>
    </div>
  );
}
