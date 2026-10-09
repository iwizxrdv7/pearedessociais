'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { AccountCard } from '@/components/AccountCard';
import { ConnectAccountModal } from '@/components/ConnectAccountModal';
import { SocialAccount } from '@/lib/types';
import {
  Users2,
  PlusCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Facebook,
  Instagram
} from 'lucide-react';

export default function ContasPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);
      }
    } catch (err) {
      console.error('Erro ao buscar contas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSyncAccount = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAccounts();
      }
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este perfil?')) return;

    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Users2 className="w-4 h-4" />
              Gestão de Perfis & Conexões
            </div>
            <h1 className="text-2xl font-extrabold text-white">Contas Conectadas na API</h1>
            <p className="text-xs text-gray-400 mt-1">
              Gerencie seus perfis do Instagram, Facebook e adicione novas contas a qualquer momento.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="py-3 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            + Conectar Nova Conta
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-950 border border-gray-800 p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Tokens Permanentes Configurados</h4>
              <p className="text-[11px] text-gray-400">
                Os perfis utilizam chaves com validade ilimitada diretamente autorizadas pelo aplicativo Meta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Total de Perfis:</span>
            <span className="text-xs font-bold text-white bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-700">
              {accounts.length}
            </span>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onSync={handleSyncAccount}
              onDelete={handleDeleteAccount}
            />
          ))}

          {/* Add New Card Button */}
          <div
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-gray-800 hover:border-indigo-500/60 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-gray-950/40 hover:bg-gray-950/80 group min-h-[300px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400 transition">
              <PlusCircle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Adicionar Nova Conta</h3>
            <p className="text-xs text-gray-400 max-w-xs">
              Conecte uma nova página ou conta do Instagram para gerenciar e postar automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      <ConnectAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAccountAdded={fetchAccounts}
      />
    </main>
  );
}
