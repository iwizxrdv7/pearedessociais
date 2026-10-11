'use client';

import React from 'react';
import {
  X,
  Facebook,
  Sparkles,
} from 'lucide-react';

interface ConnectAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountAdded?: () => void;
}

export function ConnectAccountModal({ isOpen, onClose }: ConnectAccountModalProps) {
  if (!isOpen) return null;

  const handleOAuthConnect = () => {
    // Abre a tela de permissão da Meta para importar qualquer página e conta de Instagram
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '4536635626610868';
    const redirectUri = encodeURIComponent(window.location.origin + '/contas');
    const scope = 'pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts,business_management';
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=token`;

    window.open(authUrl, '_blank', 'width=600,height=700');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Conectar Novo Perfil</h2>
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

        {/* Content */}
        <div className="p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
            <Facebook className="w-8 h-8 text-white" />
          </div>

          <div className="max-w-xs mx-auto">
            <h3 className="text-base font-bold text-white mb-1.5">Conecte com 1 Clique</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Autorize suas Páginas e Contas do Instagram vinculadas. O sistema importa e configura tudo automaticamente.
            </p>
          </div>

          <button
            onClick={handleOAuthConnect}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Facebook className="w-5 h-5" />
            Conectar Conta Meta
          </button>
        </div>
      </div>
    </div>
  );
}
