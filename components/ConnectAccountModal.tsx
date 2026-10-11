'use client';

import React, { useState } from 'react';
import {
  X,
  Facebook,
  Instagram,
  Sparkles,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded: () => void;
}

export function ConnectAccountModal({ isOpen, onClose, onAccountAdded }: ConnectAccountModalProps) {
  const [tab, setTab] = useState<'oauth' | 'manual'>('oauth');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    facebook_page_id: '',
    facebook_page_name: '',
    facebook_page_token: '',
    instagram_account_id: '',
    instagram_username: '',
    default_caption: '',
    schedule_times: '06:00, 12:00, 18:00, 21:00',
  });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuthConnect = () => {
    // Abre a tela de permissão da Meta para importar qualquer página e conta de Instagram
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '4536635626610868';
    const redirectUri = encodeURIComponent(window.location.origin + '/contas');
    const scope = 'pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts,business_management';
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;

    window.open(authUrl, '_blank', 'width=600,height=700');
  };

  const [quickToken, setQuickToken] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const handleQuickTokenImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickToken) return;
    setImportLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts/import-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userToken: quickToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao importar da Meta.');

      onAccountAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const times = formData.schedule_times
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          schedule_times: times,
          post_to_facebook: true,
          post_to_instagram: !!formData.instagram_account_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar conta.');

      onAccountAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Conectar Novo Perfil</h2>
              <p className="text-xs text-gray-400">Adicione uma página do Facebook ou conta do Instagram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-3 bg-gray-950/60 border-b border-gray-800 text-xs font-semibold gap-2">
          <button
            onClick={() => setTab('oauth')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'oauth' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Facebook className="w-4 h-4" />
            Conexão Automática Meta
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-2 ${
              tab === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Key className="w-4 h-4" />
            Inserção Manual / Token
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'oauth' ? (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
                <Facebook className="w-8 h-8 text-white" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-bold text-white mb-1.5">Conecte com 1 Clique</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Autorize suas Páginas e Contas do Instagram vinculadas. O sistema importa e configura tudo automaticamente.
                </p>
              </div>

              <div className="bg-gray-950 p-4 rounded-2xl border border-gray-800 text-left space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  Conexão Oficial via Meta Graph API v20.0
                </div>
                <p className="text-[11px] text-gray-400">
                  Permite postar vídeos em segundo plano sem necessidade de login manual ou navegador aberto.
                </p>
              </div>

              <button
                onClick={handleOAuthConnect}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Facebook className="w-5 h-5" />
                Conectar Conta Meta
              </button>

              <div className="text-[11px] text-gray-400 bg-gray-950/70 p-3 rounded-xl border border-gray-800/80 text-left space-y-1">
                <div className="font-semibold text-gray-300">💡 Dica para o Painel Meta Developers:</div>
                <p className="text-gray-400 text-[10.5px]">
                  Adicione <code className="bg-gray-900 text-indigo-400 px-1 py-0.5 rounded">pearedessociais.vercel.app</code> em <strong className="text-gray-300">Domínios do App</strong> e em <strong className="text-gray-300">URIs de Redirecionamento do OAuth</strong> no painel de seu app na Meta.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Opção Rápida: Importar via Token */}
              <div className="bg-indigo-600/10 border border-indigo-500/30 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Importação Rápida via Token da Meta
                </div>
                <p className="text-[11px] text-gray-400">
                  Cole seu Token de Acesso da Meta (do Graph API Explorer ou da Página) para o sistema detectar suas páginas e contas do Instagram automaticamente:
                </p>
                <form onSubmit={handleQuickTokenImport} className="space-y-2.5">
                  <textarea
                    rows={2}
                    required
                    placeholder="Cole seu token de acesso EAAB..."
                    value={quickToken}
                    onChange={(e) => setQuickToken(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={importLoading || !quickToken}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {importLoading ? 'Buscando e Importando...' : '🚀 Descobrir e Conectar Perfis'}
                  </button>
                </form>
              </div>

              {/* Formulário Manual Detalhado */}
              <div className="border-t border-gray-800 pt-4">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Ou preencher detalhes manualmente:
                </div>
                <form onSubmit={handleManualSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Nome do Perfil</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Minha Nova Loja"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Facebook Page ID</label>
                      <input
                        type="text"
                        placeholder="Ex: 1234567890"
                        value={formData.facebook_page_id}
                        onChange={(e) => setFormData({ ...formData, facebook_page_id: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Instagram (@username)</label>
                      <input
                        type="text"
                        placeholder="Ex: meuperfil"
                        value={formData.instagram_username}
                        onChange={(e) => setFormData({ ...formData, instagram_username: e.target.value })}
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Page Access Token</label>
                    <textarea
                      rows={2}
                      placeholder="Cole o token permanente de acesso da Página"
                      value={formData.facebook_page_token}
                      onChange={(e) => setFormData({ ...formData, facebook_page_token: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Horários de Postagem</label>
                    <input
                      type="text"
                      placeholder="06:00, 12:00, 18:00, 21:00"
                      value={formData.schedule_times}
                      onChange={(e) => setFormData({ ...formData, schedule_times: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? 'Salvando...' : 'Salvar Perfil Manualmente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
