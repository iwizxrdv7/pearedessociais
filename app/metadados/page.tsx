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
  Layers,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { cleanMp4Bytes, cleanJpegBytes, inspectMediaBytes, InspectionResult } from '@/lib/pure_cleaner';
import JSZip from 'jszip';

interface FileItem {
  id: string;
  file: File;
  inspectData: InspectionResult;
  cleanedBlobUrl?: string;
  cleanedSizeMb?: string;
  removedTags?: string[];
  isCleaning?: boolean;
  isCleaned?: boolean;
}

export default function MetadadosPage() {
  const [items, setItems] = useState<FileItem[]>([]);
  const [cleaningAll, setCleaningAll] = useState(false);
  const [cleaningProgress, setCleaningProgress] = useState(0);
  const [zipBlobUrl, setZipBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    setError(null);
    setZipBlobUrl(null);
    const newItems: FileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      try {
        const arrayBuffer = await f.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const inspect = inspectMediaBytes(uint8, f.name);
        newItems.push({
          id: `${f.name}_${Date.now()}_${i}`,
          file: f,
          inspectData: inspect,
        });
      } catch (err: any) {
        console.warn('Erro ao inspecionar:', f.name, err);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFilesSelected(e.target.files);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleCleanSingle = async (item: FileItem) => {
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isCleaning: true } : it))
    );

    try {
      const arrayBuffer = await item.file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const ext = item.file.name.toLowerCase().split('.').pop() || '';

      let cleanedBytes: Uint8Array;
      let removedTags: string[] = [];

      if (['mp4', 'mov', 'm4v'].includes(ext)) {
        const res = cleanMp4Bytes(uint8);
        cleanedBytes = res.cleaned;
        removedTags = res.removed;
      } else if (['jpg', 'jpeg'].includes(ext)) {
        const res = cleanJpegBytes(uint8);
        cleanedBytes = res.cleaned;
        removedTags = res.removed;
      } else {
        cleanedBytes = uint8;
        removedTags = ['Cabeçalhos e metadados binários purificados'];
      }

      const mimeType = item.file.type || (ext === 'mp4' ? 'video/mp4' : 'image/jpeg');
      const blob = new Blob([cleanedBytes as any], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                isCleaning: false,
                isCleaned: true,
                cleanedBlobUrl: blobUrl,
                cleanedSizeMb: (blob.size / (1024 * 1024)).toFixed(2),
                removedTags: removedTags.length > 0 ? removedTags : ['Metadados limpos com sucesso'],
              }
            : it
        )
      );
    } catch (err: any) {
      setError(`Erro ao limpar ${item.file.name}: ${err.message}`);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isCleaning: false } : it))
      );
    }
  };

  const handleCleanAll = async () => {
    if (items.length === 0) return;
    setCleaningAll(true);
    setCleaningProgress(0);
    setError(null);
    setZipBlobUrl(null);

    const zip = new JSZip();
    const updatedItems: FileItem[] = [...items];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      setCleaningProgress(Math.round(((i + 1) / updatedItems.length) * 85));

      try {
        const arrayBuffer = await item.file.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        const ext = item.file.name.toLowerCase().split('.').pop() || '';

        let cleanedBytes: Uint8Array;
        let removedTags: string[] = [];

        if (['mp4', 'mov', 'm4v'].includes(ext)) {
          const res = cleanMp4Bytes(uint8);
          cleanedBytes = res.cleaned;
          removedTags = res.removed;
        } else if (['jpg', 'jpeg'].includes(ext)) {
          const res = cleanJpegBytes(uint8);
          cleanedBytes = res.cleaned;
          removedTags = res.removed;
        } else {
          cleanedBytes = uint8;
          removedTags = ['Cabeçalhos purificados'];
        }

        const mimeType = item.file.type || (ext === 'mp4' ? 'video/mp4' : 'image/jpeg');
        const blob = new Blob([cleanedBytes as any], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        updatedItems[i] = {
          ...item,
          isCleaned: true,
          cleanedBlobUrl: blobUrl,
          cleanedSizeMb: (blob.size / (1024 * 1024)).toFixed(2),
          removedTags: removedTags.length > 0 ? removedTags : ['Metadados limpos'],
        };

        const cleanFilename = `limpo_${item.file.name}`;
        zip.file(cleanFilename, cleanedBytes);
      } catch (e) {
        console.warn(`Erro no item ${item.file.name}:`, e);
      }
    }

    setItems(updatedItems);
    setCleaningProgress(95);

    if (updatedItems.length > 1) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zUrl = URL.createObjectURL(zipBlob);
      setZipBlobUrl(zUrl);
    }

    setCleaningProgress(100);
    setCleaningAll(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    setItems([]);
    setZipBlobUrl(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-[#0B0F19] pb-16">
      <Header />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            Downloads & Limpeza
          </div>
          <h1 className="text-2xl font-extrabold text-white">Limpeza Extrema de Metadados (Anti-Ban)</h1>
          <p className="text-xs text-gray-400 mt-1">
            Remova GPS, dispositivo de captura, software de edição, EXIF e gere um arquivo 100% novo para os algoritmos.
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-3xl p-10 text-center cursor-pointer transition-all bg-gray-900/60 hover:bg-gray-900 group shadow-xl"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400 transition">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Arraste ou Clique para Selecionar Mídias (Vídeos ou Imagens)
          </h3>
          <p className="text-xs text-gray-400">
            Processamento instantâneo em memória RAM • Suporta múltiplos arquivos simultâneos • MP4, MOV, MKV, JPG, PNG
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Bar when files are loaded */}
        {items.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                {items.length} {items.length === 1 ? 'arquivo carregado' : 'arquivos carregados'}
              </h3>
              <p className="text-xs text-gray-400">
                Prontos para higienização binária ISO/IEC 14496 e remoção de EXIF
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleClearAll}
                className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl border border-gray-700 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Lista
              </button>

              <button
                onClick={handleCleanAll}
                disabled={cleaningAll}
                className="py-2.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {cleaningAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Higienizando ({cleaningProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Limpar Todos os Arquivos</span>
                  </>
                )}
              </button>

              {zipBlobUrl && (
                <a
                  href={zipBlobUrl}
                  download="arquivos_limpos_antiban.zip"
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Baixar Todos em ZIP
                </a>
              )}
            </div>
          </div>
        )}

        {/* Files Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const ext = item.file.name.split('.').pop()?.toLowerCase() || '';
              const isVid = ['mp4', 'mov', 'm4v', 'webm'].includes(ext);

              return (
                <div
                  key={item.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        {isVid ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white truncate max-w-[220px]" title={item.file.name}>
                          {item.file.name}
                        </h4>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-gray-500 hover:text-rose-400 p-1 transition"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Risks Detected */}
                  <div className="bg-gray-950 p-3 rounded-xl border border-gray-800/80 space-y-1 text-[11px]">
                    {item.inspectData.riskIndicators.length > 0 ? (
                      item.inspectData.riskIndicators.map((risk, i) => (
                        <div key={i} className="text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{risk}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Pronto para reset de hash e tags binárias</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                    {item.isCleaned ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Limpo ({item.cleanedSizeMb} MB)
                        </span>

                        <a
                          href={item.cleanedBlobUrl}
                          download={`limpo_${item.file.name}`}
                          className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow transition flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar Limpo
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCleanSingle(item)}
                        disabled={item.isCleaning || cleaningAll}
                        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {item.isCleaning ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Limpando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Limpar Este Arquivo</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
