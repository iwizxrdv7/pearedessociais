'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  DownloadCloud,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User
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
  const router = useRouter();

  // Não renderizar a Sidebar na página de login
  if (pathname === '/login') {
    return null;
  }

  // Estado de expansão fixo/controlado pelo usuário para evitar reflows involuntários
  const [isExpanded, setIsExpanded] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('admin@pearedessociais.com');

  useEffect(() => {
    // Restaurar preferência do usuário do localStorage
    try {
      const saved = localStorage.getItem('sidebar_expanded');
      if (saved !== null) {
        setIsExpanded(saved === 'true');
      }
    } catch {}

    // Buscar usuário autenticado
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const sidebarWidth = isExpanded ? 'w-60' : 'w-[72px]';

  return (
    <>
      {/* Espaçador estático sincronizado com a largura para evitar saltos visuais */}
      <div className={`${sidebarWidth} flex-shrink-0 h-screen hidden md:block transition-[width] duration-200 ease-out`} aria-hidden="true" />

      {/* Sidebar sólida de alto FPS (sem backdrop-blur pesado para 120 FPS fixos) */}
      <aside
        className={`fixed top-0 left-0 h-screen z-40 bg-[#0B0F19] border-r border-gray-800/90 flex flex-col justify-between select-none overflow-x-hidden ${sidebarWidth} transition-[width] duration-200 ease-out shadow-xl shadow-black/60`}
      >
        <div className="overflow-y-auto overflow-x-hidden flex-1 py-1">
          {/* Logo & Brand Header */}
          <div className="h-16 border-b border-gray-800/80 flex items-center justify-between px-3.5">
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-600/30 flex-shrink-0 transition-transform hover:scale-105">
                <Zap className="w-5 h-5 text-white" />
              </div>
              {isExpanded && (
                <div className="whitespace-nowrap overflow-hidden">
                  <div className="font-bold text-sm text-white tracking-tight flex items-center gap-1.5">
                    P&A <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-1.5 py-0.5 rounded-full border border-indigo-500/30">PRO</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-medium">Postador & Downloads</div>
                </div>
              )}
            </Link>

            {/* Botão de minimizar/expandir sem jitter */}
            <button
              onClick={toggleSidebar}
              title={isExpanded ? 'Recolher menu' : 'Expandir menu'}
              className="w-7 h-7 rounded-lg bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition"
            >
              {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Seção 1: Principal */}
          <div className="p-2 space-y-1">
            {isExpanded && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                Postador & Agendador
              </div>
            )}
            {MAIN_MENU.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-10 rounded-xl font-medium text-xs transition-colors group ${
                    isExpanded ? 'px-3 gap-3 w-full' : 'justify-center px-0 w-10 mx-auto'
                  } ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                  {isExpanded && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Seção 2: Downloads & Limpeza */}
          <div className="p-2 space-y-1 border-t border-gray-800/80">
            {isExpanded && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 whitespace-nowrap">
                <DownloadCloud className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Downloads & Limpeza</span>
              </div>
            )}
            {DOWNLOADS_MENU.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-10 rounded-xl font-medium text-xs transition-colors group ${
                    isExpanded ? 'px-3 gap-3 w-full' : 'justify-center px-0 w-10 mx-auto'
                  } ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                  {isExpanded && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Seção 3: Gerenciamento */}
          <div className="p-2 space-y-1 border-t border-gray-800/80">
            {isExpanded && (
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                Gerenciamento
              </div>
            )}
            {MANAGEMENT_MENU.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-10 rounded-xl font-medium text-xs transition-colors group ${
                    isExpanded ? 'px-3 gap-3 w-full' : 'justify-center px-0 w-10 mx-auto'
                  } ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`} />
                  {isExpanded && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Rodapé: Usuário Conectado e Logout */}
        <div className="border-t border-gray-800/80 p-2.5 space-y-2 bg-[#0B0F19]">
          <EngineStatusBadge isExpanded={isExpanded} />

          {/* User Profile & Sair */}
          <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} px-1 pt-1`}>
            {isExpanded ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] font-semibold text-gray-200 truncate leading-tight">Admin P&A</div>
                  <div className="text-[9px] text-gray-400 truncate">{userEmail}</div>
                </div>
              </div>
            ) : null}

            <button
              onClick={handleLogout}
              title="Encerrar sessão"
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition flex items-center justify-center flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function EngineStatusBadge({ isExpanded }: { isExpanded: boolean }) {
  const [status, setStatus] = useState<'online' | 'warming_up' | 'offline'>('online');

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
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
    // Checagem a cada 45 segundos para economizar bateria e CPU
    const interval = setInterval(checkHealth, 45000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!isExpanded) {
    return (
      <div
        className="w-10 h-8 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto"
        title={status === 'online' ? 'Motor em Nuvem: ONLINE' : 'Motor em Nuvem: CONECTANDO...'}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'
          }`}
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#111726] p-2 rounded-xl border border-gray-800/90 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'
          }`}
        />
        <span className="text-[10px] font-semibold text-gray-300">Motor Nuvem</span>
      </div>
      <span
        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
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
