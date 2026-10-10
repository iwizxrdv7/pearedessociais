'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Users2,
  History,
  Zap,
  Film,
  Instagram,
  ShieldCheck,
  DownloadCloud
} from 'lucide-react';

const MAIN_MENU = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Calendário & Grade', href: '/calendario', icon: Calendar },
  { name: 'Fila & Agendador', href: '/fila', icon: Layers },
];

const DOWNLOADS_MENU = [
  { name: 'Baixar TikTok', href: '/tiktok', icon: Film },
  { name: 'Baixar Instagram', href: '/instagram', icon: Instagram },
  { name: 'Limpar Metadados', href: '/metadados', icon: ShieldCheck },
];

const MANAGEMENT_MENU = [
  { name: 'Conectar Contas', href: '/contas', icon: Users2 },
  { name: 'Histórico & Logs', href: '/historico', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div className="overflow-y-auto">
        {/* Logo & Brand */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                P&A <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-1.5 py-0.2 rounded-full border border-indigo-500/30">PRO</span>
              </div>
              <div className="text-[11px] text-gray-400 font-medium">Postador & Downloads</div>
            </div>
          </Link>
        </div>

        {/* Section 1: Main Platform */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Postador & Agendador
          </div>
          {MAIN_MENU.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Section 2: Downloads & Limpeza */}
        <div className="p-3 space-y-1 border-t border-gray-800/80">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <DownloadCloud className="w-3.5 h-3.5" />
            Downloads & Limpeza
          </div>
          {DOWNLOADS_MENU.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Section 3: Management */}
        <div className="p-3 space-y-1 border-t border-gray-800/80">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Gerenciamento
          </div>
          {MANAGEMENT_MENU.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer Info com Checagem de Saúde do Motor */}
      <div className="p-3.5 border-t border-gray-800">
        <EngineStatusBadge />
      </div>
    </aside>
  );
}

function EngineStatusBadge() {
  const [status, setStatus] = React.useState<'online' | 'warming_up' | 'offline'>('online');

  React.useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch('/api/health', { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeout);
        if (mounted) {
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status === 'online' ? 'online' : 'warming_up');
          } else {
            setStatus('warming_up');
          }
        }
      } catch {
        if (mounted) setStatus('warming_up');
      }
    };

    checkHealth();
    // Ping a cada 20 segundos para manter o motor ativo e aquecido
    const interval = setInterval(checkHealth, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (status === 'online') {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 p-3 rounded-xl border border-emerald-500/20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-semibold text-gray-200">Motor em Nuvem</span>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
          ONLINE
        </span>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-gray-900 to-gray-950 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between cursor-pointer group"
      title="O motor em nuvem está conectando para processar seus downloads e limpeza de metadados."
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span className="text-[11px] font-semibold text-gray-300">Motor em Nuvem</span>
      </div>
      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-mono font-bold group-hover:bg-amber-500/20 transition">
        CONECTANDO
      </span>
    </div>
  );
}
