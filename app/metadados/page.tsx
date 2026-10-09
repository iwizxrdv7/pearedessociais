'use client';

import React, { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import {
  ShieldCheck,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Download,
  Trash2,
  Lock,
  Cpu,
  RefreshCw,
  Film,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface MetadataResult {
  filename: string;
  extension: string;
  size_bytes: number;
  is_video: boolean;
  is_image: boolean;
  metadata_found: Record<string, string>;
  risk_indicators: string[];
}

export default function MetadadosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [inspectData, setInspectData] = useState<MetadataResult | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setInspectData(null);
      setCleanSuccess(null);
      setError(null);
      await inspectFile(selected);
    }
  };

  const inspectFile = async (targetFile: File) => {
    setInspecting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', targetFile);

      const res = await fetch('/api/metadata/inspect', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao inspecionar metadados.');

      setInspectData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleClean = async () => {
    if (!file) return;
    setCleaning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/metadata/clean', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao limpar metadados.');

      setCleanSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            MediaHub Pro Suite
          </div>
          <h1 className="text-2xl font-extrabold text-white">Limpeza Extrema de Metadados (Anti-Ban)</h1>
          <p className="text-xs text-gray-400 mt-1">
            Remova GPS, dispositivo de captura, software de edição, EXIF e gere um arquivo 100% novo para os algoritmos.
          </p>
        </div>

        {/* Dropzone */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-3xl p-10 text-center cursor-pointer transition-all bg-gray-950/40 hover:bg-gray-950/80 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400 transition">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {file ? file.name : 'Selecione um Vídeo ou Imagem para Limpar'}
            </h3>
            <p className="text-xs text-gray-400">
              Suporta MP4, MOV, MKV, WebM, JPG, PNG, WebP
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Inspection Details */}
        {inspectData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Detected Risks */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Metadados Detectados
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {(inspectData.size_bytes / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>

              {inspectData.risk_indicators.length > 0 ? (
                <div className="space-y-2">
                  {inspectData.risk_indicators.map((risk, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                  Nenhum metadado de alto risco encontrado no cabeçalho básico.
                </p>
              )}

              {/* Raw Metadata Dump */}
              <div className="mt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Cabeçalhos Encontrados:
                </span>
                <div className="mt-2 bg-gray-950 p-3 rounded-xl max-h-48 overflow-y-auto font-mono text-[11px] text-gray-300 border border-gray-800 space-y-1">
                  {Object.entries(inspectData.metadata_found).length === 0 ? (
                    <span className="text-gray-500">Vazio</span>
                  ) : (
                    Object.entries(inspectData.metadata_found).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-gray-900 py-0.5">
                        <span className="text-indigo-400">{k}:</span>
                        <span className="truncate max-w-[200px]">{v}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Cleaner Action */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold">
                  <Cpu className="w-4 h-4" />
                  Processamento FFmpeg Integrado
                </div>
                <h3 className="text-base font-bold text-white">Executar Limpeza e Criar Arquivo Virgem</h3>
                <ul className="space-y-2 text-xs text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Remove 100% de EXIF, IPTC, XMP e GPS
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Regenera streams de áudio e vídeo com novo hash SHA-256
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Reseta timestamps para a data atual
                  </li>
                </ul>
              </div>

              {cleanSuccess ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Arquivo Limpo com Sucesso!
                  </div>
                  <p className="text-[11px] text-gray-300">
                    Arquivo gerado: <span className="font-mono text-white">{cleanSuccess.filename}</span>
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleClean}
                  disabled={cleaning}
                  className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {cleaning ? 'Executando Limpeza FFmpeg...' : 'Limpar Metadados Agora'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
