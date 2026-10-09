'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Film,
  Sparkles,
  Calendar,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Hash
} from 'lucide-react';
import { SocialAccount, VideoPost } from '@/lib/types';

interface VideoUploadZoneProps {
  accounts: SocialAccount[];
  selectedAccountId: string;
  onPostCreated: () => void;
}

export function VideoUploadZone({ accounts, selectedAccountId, onPostCreated }: VideoUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = () => {
    if (activeAccount) {
      if (activeAccount.default_caption) setCaption(activeAccount.default_caption);
      if (activeAccount.default_hashtags) setHashtags(activeAccount.default_hashtags.join(' '));
    }
  };

  const handleSubmit = async (publishNow: boolean = false) => {
    if (files.length === 0) {
      setErrorMsg('Selecione pelo menos um vídeo para agendar ou postar.');
      return;
    }
    if (!activeAccount) {
      setErrorMsg('Nenhuma conta selecionada.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      for (const file of files) {
        // Criar registro do post
        const postRes = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: activeAccount.id,
            title: file.name.replace(/\.[^/.]+$/, ''),
            caption: caption || activeAccount.default_caption || '',
            hashtags: hashtags ? hashtags.split(' ').map((h) => h.replace('#', '')) : [],
            video_url: file.name, // Local filename
            video_filename: file.name,
            file_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
            status: publishNow ? 'processing' : 'scheduled',
            scheduled_for: publishNow ? undefined : `${scheduleDate}T${scheduleTime}:00`,
          }),
        });

        const postData = await postRes.json();

        // Se o usuário clicou em Publicar Agora
        if (publishNow && postData.post?.id) {
          await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: postData.post.id }),
          });
        }
      }

      setSuccessMsg(
        publishNow
          ? 'Vídeo enviado para processamento e publicação na API!'
          : `${files.length} vídeo(s) agendado(s) com sucesso na grade!`
      );
      setFiles([]);
      onPostCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar envio.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            Upload em Lote & Agendador
          </h2>
          <p className="text-xs text-gray-400">
            Arraste vídeos para publicar no Instagram e Facebook via Meta API
          </p>
        </div>

        {activeAccount && (
          <button
            type="button"
            onClick={handleApplyPreset}
            className="text-xs bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Usar Legenda Padrão ({activeAccount.name})
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Dropzone & Files */}
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer transition-all bg-gray-950/40 hover:bg-gray-950/80 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFilesSelect}
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-indigo-400 transition">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Clique ou arraste vídeos (.MP4, .MOV)
            </h3>
            <p className="text-xs text-gray-400">
              Você pode selecionar vários arquivos de uma só vez
            </p>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                Vídeos Selecionados ({files.length})
              </div>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Film className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-gray-200 truncate font-medium">{file.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(idx)}
                    className="text-gray-500 hover:text-rose-400 p-1 rounded-md transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Captions, Hashtags & Schedule */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
              <span>Legenda da Postagem</span>
              <span className="text-[10px] text-gray-500">{caption.length} caracteres</span>
            </label>
            <textarea
              rows={4}
              placeholder="Digite a legenda que acompanhará o vídeo nos Reels..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              Hashtags (separadas por espaço)
            </label>
            <input
              type="text"
              placeholder="#viral #reels #brasil #dicas"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-gray-950/60 p-3.5 rounded-2xl border border-gray-800">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Data
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Horário
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isUploading || files.length === 0}
              className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 border border-gray-700"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              {isUploading ? 'Agendando...' : 'Agendar na Grade'}
            </button>

            <button
              onClick={() => handleSubmit(true)}
              disabled={isUploading || files.length === 0}
              className="py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isUploading ? 'Publicando...' : 'Publicar 1 Agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
