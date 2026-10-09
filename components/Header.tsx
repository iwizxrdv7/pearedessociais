'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SocialAccount } from '@/lib/types';
import {
  ChevronDown,
  PlusCircle,
  Instagram,
  Facebook,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  selectedAccountId?: string;
  onSelectAccount?: (id: string) => void;
}

export function Header({ selectedAccountId, onSelectAccount }: HeaderProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState<SocialAccount | null>(null);

  useEffect(() => {
    fetch('/api/accounts')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (selectedAccountId) {
            const found = data.find((a) => a.id === selectedAccountId);
            if (found) setActiveAccount(found);
          } else if (data.length > 0) {
            setActiveAccount(data[0]);
            if (onSelectAccount) onSelectAccount(data[0].id);
          }
        }
      })
      .catch((err) => console.error('Erro ao carregar contas:', err));
  }, [selectedAccountId]);

  const handleSelect = (account: SocialAccount) => {
    setActiveAccount(account);
    setIsOpen(false);
    if (onSelectAccount) onSelectAccount(account.id);
  };

  return (
    <header className="h-20 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Account Switcher Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800/80 border border-gray-700/80 px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          {activeAccount ? (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={activeAccount.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop'}
                  alt={activeAccount.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/40"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-gray-950"></div>
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                  {activeAccount.name}
                  {activeAccount.instagram_username && (
                    <span className="text-[10px] text-gray-400 font-normal">(@{activeAccount.instagram_username})</span>
                  )}
                </div>
                <div className="text-[10px] text-indigo-400 font-medium">Perfil Selecionado</div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Carregando perfis...</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl py-2 z-50">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800">
              Alternar Perfil
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => handleSelect(account)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800 transition ${
                    activeAccount?.id === account.id ? 'bg-indigo-600/15 text-indigo-400 font-semibold' : 'text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={account.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop'}
                      alt={account.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div>
                      <div className="text-xs font-medium text-white">{account.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {account.instagram_username ? `@${account.instagram_username}` : account.facebook_page_name || 'Facebook'}
                      </div>
                    </div>
                  </div>
                  {activeAccount?.id === account.id && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-800 p-2">
              <Link
                href="/contas"
                className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium rounded-lg hover:bg-indigo-500/10 transition"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Conectar Novo Perfil
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <Link
          href="/fila"
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          + Subir Vídeos & Agendar
        </Link>
      </div>
    </header>
  );
}
