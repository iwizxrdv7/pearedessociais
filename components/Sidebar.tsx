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
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <>
      {/* Espaçador estático para reservar os 72px e evitar re-layout/queda de FPS na página principal */}
      <div className="w-[72px] flex-shrink-0 h-screen hidden md:block pointer-events-none" aria-hidden="true" />

      {/* Menu lateral flutuante com aceleração por GPU e curva cúbica ultra-suave */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`fixed top-0 left-0 h-screen z-40 bg-gray-950/95 backdrop-blur-xl border-r border-gray-800/80 flex flex-col justify-between select-none overflow-x-hidden overflow-y-auto transform-gpu will-change-[width] transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded
            ? 'w-64 shadow-2xl shadow-black/95 ring-1 ring-white/5'
            : 'w-[72px] shadow-lg shadow-black/40'
        }`}
      >
        <div className="overflow-y-auto overflow-x-hidden flex-1 py-1">
          {/* Logo & Brand Header */}
          <div
            className={`h-16 border-b border-gray-800/80 flex items-center transition-all duration-300 ${
              isExpanded ? 'px-4' : 'justify-center px-0'
            }`}
          >
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0 transition-transform duration-300 hover:scale-105">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div
                className={`transition-[opacity,transform] duration-200 ease-out whitespace-nowrap overflow-hidden ${
                  isExpanded
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-3 pointer-events-none w-0'
                }`}
              >
                <div className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
                  P&A <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-1.5 py-0.5 rounded-full border border-indigo-500/30">PRO</span>
                </div>
                <div className="text-[11px] text-gray-400 font-medium">Postador & Downloads</div>
              </div>
            </Link>
          </div>

          {/* Section 1: Main Platform */}
          <div className="p-2 space-y-1">
            <div
              className={`px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                isExpanded ? 'opacity-100 py-1.5' : 'opacity-0 h-0 py-0 pointer-events-none'
              }`}
            >
              Postador & Agendador
            </div>
            {MAIN_MENU.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-10 rounded-xl font-medium text-xs transition-colors duration-150 group relative ${
                    isExpanded ? 'px-3 gap-3 w-full' : 'justify-center px-0 w-10 mx-auto'
                  } ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'
                  }`} />
                  <span
                    className={`transition-[opacity,transform] duration-200 ease-out whitespace-nowrap overflow-hidden ${
                      isExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2 pointer-events-none w-0'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Section 2: Downloads & Limpeza */}
          <div className="p-2 space-y-1 border-t border-gray-800/80">
            <div
              className={`px-3 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                isExpanded ? 'opacity-100 py-1.5' : 'opacity-0 h-0 py-0 pointer-events-none'
              }`}
            >
              <DownloadCloud className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Downloads & Limpeza</span>
            </div>
            {DOWNLOADS_MENU.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-10 rounded-xl font-medium text-xs transition-colors duration-150 group relative ${
                    isExpanded ? 'px-3 gap-3 w-full' : 'justify-center px-0 w-10 mx-auto'
                  } ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'
                  }`} />
                  <span
                    className={`transition-[opacity,transform] duration-200 ease-out whitespace-nowrap overflow-hidden ${
                      isExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2 pointer-events-none w-0'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Section 3: Management */}
          <div className="p-2 space-y-1 border-t border-gray-800/80">
            <div
              className={`px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                isExpanded ? 'opacity-100 py-1.5' : 'opacity-0 h-0 py-0 pointer-events-none'
              }`}
            >
              Gerenciamento
            </div>
            {MANAGEMENT_MENU.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-10 rounded-xl font-medium text-xs transition-colors duration-150 group relative ${
                    isExpanded ? 'px-3 gap-3 w-full' : 'justify-center px-0 w-10 mx-auto'
                  } ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                    isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'
                  }`} />
                  <span
                    className={`transition-[opacity,transform] duration-200 ease-out whitespace-nowrap overflow-hidden ${
                      isExpanded
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-2 pointer-events-none w-0'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer Info com Checagem de Saúde do Motor */}
        <div
          className={`h-16 border-t border-gray-800/80 flex items-center transition-all duration-300 ${
            isExpanded ? 'px-3' : 'justify-center px-0'
          }`}
        >
          <EngineStatusBadge isExpanded={isExpanded} />
        </div>
      </aside>
    </>
  );
}

function EngineStatusBadge({ isExpanded }: { isExpanded: boolean }) {
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

  if (!isExpanded) {
    return (
      <div
        className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 flex items-center justify-center transition shadow-sm cursor-pointer"
        title={status === 'online' ? 'Motor em Nuvem: ONLINE' : 'Motor em Nuvem: CONECTANDO...'}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'
          }`}
        ></span>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-gradient-to-br from-gray-900 to-gray-950 p-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-between shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'
          }`}
        ></span>
        <span className="text-[11px] font-semibold text-gray-200">Motor em Nuvem</span>
      </div>
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
          status === 'online'
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-amber-500/10 text-amber-400'
        }`}
      >
        {status === 'online' ? 'ONLINE' : 'CONECTANDO'}
      </span>
    </div>
  );
}
