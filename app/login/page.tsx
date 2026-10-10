'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Zap,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFillDemo = () => {
    setEmail('admin@pearedessociais.com');
    setPassword('admin123');
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Preencha seu email e senha para continuar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      // Sucesso! Redirecionar para a página pretendida
      router.push(redirectPath);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao entrar no sistema. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111726] border border-gray-800 rounded-3xl p-7 shadow-2xl shadow-black/80">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white tracking-tight">Entrar na sua conta</h2>
        <p className="text-xs text-gray-400 mt-0.5">Informe seus dados para acessar o painel de controle</p>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
            <span>Email de Acesso</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@pearedessociais.com"
              autoComplete="email"
              required
              className="w-full bg-[#0B0F19] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
            <span>Senha</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full bg-[#0B0F19] border border-gray-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-200 transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-indigo-600 focus:ring-indigo-500 rounded-sm"
            />
            <span className="text-xs text-gray-300">Lembrar-me</span>
          </label>
          <span className="text-[11px] text-gray-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Sessão Segura
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <span>Entrar no Painel</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Dica de Acesso Rápido / Demo */}
      <div className="mt-6 pt-5 border-t border-gray-800/80">
        <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-gray-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Credencial de Administrador
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              admin@pearedessociais.com | admin123
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="py-1 px-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-[10px] font-semibold rounded-lg transition cursor-pointer"
          >
            Preencher
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow de alta performance */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 25%, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 40%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-600/25 mb-4 transform hover:scale-105 transition-transform">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-2xl font-black text-white tracking-tight">P&A REDES SOCIAIS</h1>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
              PRO
            </span>
          </div>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Plataforma de automação, downloads e agendamento de Reels em alta performance
          </p>
        </div>

        {/* Suspense boundary wrapping useSearchParams */}
        <Suspense
          fallback={
            <div className="bg-[#111726] border border-gray-800 rounded-3xl p-10 flex flex-col items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-xs text-gray-400">Carregando tela de login...</span>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Rodapé Seguro */}
        <div className="text-center mt-6 text-[11px] text-gray-500 flex items-center justify-center gap-2">
          <span>P&A Redes Sociais &copy; 2026</span>
          <span>&bull;</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Meta API Conectada
          </span>
        </div>
      </div>
    </div>
  );
}
