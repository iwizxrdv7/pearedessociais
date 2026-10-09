'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  UploadCloud,
  Users2,
  History,
  Settings,
  Zap,
  ExternalLink
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendário & Grade', href: '/calendario', icon: Calendar },
  { name: 'Fila de Vídeos & Upload', href: '/fila', icon: Layers },
  { name: 'Conectar Contas', href: '/contas', icon: Users2 },
  { name: 'Histórico & Status', href: '/historico', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col justify-between h-screen sticky top-0 z-30">
      <div>
        {/* Logo & Brand */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                P&A <span className="text-xs bg-indigo-500/20 text-indigo-400 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">API</span>
              </div>
              <div className="text-xs text-gray-400 font-medium">Postador & Agendador</div>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Menu Principal
          </div>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Meta API Status Badge */}
      <div className="p-4 border-t border-gray-800">
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 p-3.5 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Meta Graph API
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono">v20.0</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Tokens Permanentes Ativos. Publicação direta sem navegador.
          </p>
        </div>
      </div>
    </aside>
  );
}
