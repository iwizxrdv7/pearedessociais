'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Hash,
  Plus,
  X,
  Smile,
  Flame,
  Check,
  Instagram,
  Facebook,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { SocialAccount } from '@/lib/types';

interface VideoUploadZoneProps {
  accounts: SocialAccount[];
  selectedAccountId: string;
  onPostCreated: () => void;
}

function getNowDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNowTimeStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function VideoUploadZone({ accounts, selectedAccountId, onPostCreated }: VideoUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Grade de múltiplos horários automáticos
  const [scheduleMode, setScheduleMode] = useState<'single' | 'batch_grid'>('batch_grid');
  const [gridTimes, setGridTimes] = useState<string[]>(['18:00']);
  const [newTimeInput, setNewTimeInput] = useState('12:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // Seg a Dom (0=Dom, 1=Seg, etc.)
  const [savedPresetMsg, setSavedPresetMsg] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pré-setar data atual e carregar horários salvos do localStorage
  useEffect(() => {
    setScheduleDate(getNowDateStr());
    setScheduleTime(getNowTimeStr());

    try {
      const storageKey = `pea_schedule_pref_${selectedAccountId || 'default'}`;
      const saved = localStorage.getItem(storageKey) || localStorage.getItem('pea_schedule_pref_global');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.gridTimes) && parsed.gridTimes.length > 0) {
          setGridTimes(parsed.gridTimes);
        }
        if (Array.isArray(parsed.selectedDays) && parsed.selectedDays.length > 0) {
          setSelectedDays(parsed.selectedDays);
        }
        if (parsed.scheduleMode) {
          setScheduleMode(parsed.scheduleMode);
        }
        if (parsed.scheduleTime) {
          setScheduleTime(parsed.scheduleTime);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar preferências de agendamento:', e);
    }
  }, [selectedAccountId]);

  const handleSaveSchedulePreset = () => {
    try {
      const pref = {
        gridTimes,
        selectedDays,
        scheduleMode,
        scheduleTime,
      };
      const storageKey = `pea_schedule_pref_${selectedAccountId || 'default'}`;
      localStorage.setItem(storageKey, JSON.stringify(pref));
      localStorage.setItem('pea_schedule_pref_global', JSON.stringify(pref));
      setSavedPresetMsg(true);
      setTimeout(() => setSavedPresetMsg(false), 3000);
    } catch (e) {
      console.error('Erro ao salvar preferências:', e);
    }
  };

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

  const handleInsertEmoji = (emoji: string) => {
    setCaption((prev) => prev + (prev ? ' ' : '') + emoji);
  };

  const handleInsertHashtagPreset = (tags: string) => {
    setHashtags((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tags}` : tags;
    });
  };

  const handleAddTimeSlot = () => {
    if (!newTimeInput || gridTimes.includes(newTimeInput)) return;
    setGridTimes((prev) => [...prev, newTimeInput].sort());
  };

  const handleRemoveTimeSlot = (timeToRemove: string) => {
    if (gridTimes.length <= 1) return;
    setGridTimes((prev) => prev.filter((t) => t !== timeToRemove));
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  /**
   * Calcula a fila de datas e horários sequenciais para os vídeos selecionados
   */
  const calculateScheduleSlots = (count: number): Array<{ dateStr: string; timeStr: string; isoString: string }> => {
    const slots: Array<{ dateStr: string; timeStr: string; isoString: string }> = [];
    if (count === 0) return slots;

    if (scheduleMode === 'single') {
      const dateVal = scheduleDate || getNowDateStr();
      const timeVal = scheduleTime || getNowTimeStr();
      const [year, month, day] = dateVal.split('-').map(Number);
      const [hours, minutes] = timeVal.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hours, minutes, 0);

      for (let i = 0; i < count; i++) {
        slots.push({
          dateStr: dateVal,
          timeStr: timeVal,
          isoString: localDate.toISOString(),
        });
      }
      return slots;
    }

    // Modo Grade Sequencial (estilo SpeedPost)
    const startDateVal = scheduleDate || getNowDateStr();
    const [startYear, startMonth, startDay] = startDateVal.split('-').map(Number);
    const cursorDate = new Date(startYear, startMonth - 1, startDay);
    const sortedTimes = [...gridTimes].sort();

    let assigned = 0;
    let safetyDays = 0;

    while (assigned < count && safetyDays < 180) {
      const dayOfWeek = cursorDate.getDay(); // 0 = Domingo, 1 = Segunda, ...

      if (selectedDays.includes(dayOfWeek)) {
        for (const timeStr of sortedTimes) {
          if (assigned >= count) break;

          const [hours, minutes] = timeStr.split(':').map(Number);
          const slotDate = new Date(
            cursorDate.getFullYear(),
            cursorDate.getMonth(),
            cursorDate.getDate(),
            hours,
            minutes,
            0
          );

          // Se for o dia inicial e o horário já tiver passado hoje, ainda assim agendamos para hoje ou próximo slot
          const y = slotDate.getFullYear();
          const m = String(slotDate.getMonth() + 1).padStart(2, '0');
          const d = String(slotDate.getDate()).padStart(2, '0');

          slots.push({
            dateStr: `${d}/${m}`,
            timeStr,
            isoString: slotDate.toISOString(),
          });
          assigned++;
        }
      }

      // Avançar para o próximo dia
      cursorDate.setDate(cursorDate.getDate() + 1);
      safetyDays++;
    }

    return slots;
  };

  const previewSlots = calculateScheduleSlots(files.length);

  const handleSubmit = async (publishNow: boolean = false) => {
    if (files.length === 0) {
      setErrorMsg('Selecione pelo menos um vídeo para agendar ou postar.');
      return;
    }
    if (!activeAccount) {
      setErrorMsg('Nenhuma conta selecionada.');
      return;
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB (Limite Supabase Free)
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles
        .map((f) => `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB)`)
        .join(', ');
      setErrorMsg(
        `O vídeo ${names} ultrapassa o limite máximo de 50 MB do Supabase. Por favor, utilize arquivos com menos de 50 MB ou comprima o vídeo antes de enviar.`
      );
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const calculatedSlots = calculateScheduleSlots(files.length);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setSuccessMsg(`Enviando ${file.name} para o armazenamento na nuvem (${i + 1}/${files.length})...`);

        // 1. Obter URL assinada de upload no Supabase
        const urlReq = await fetch('/api/media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        });
        const urlData = await urlReq.json();
        if (!urlReq.ok || !urlData.signedUrl) {
          throw new Error(urlData.error || 'Falha ao gerar link de upload seguro na nuvem.');
        }

        // 2. Enviar arquivo diretamente do navegador para o Supabase Storage
        const uploadRes = await fetch(urlData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'video/mp4' },
          body: file,
        });

        if (!uploadRes.ok) {
          let errDetail = `HTTP ${uploadRes.status}`;
          try {
            const errJson = await uploadRes.json();
            if (errJson?.code === 'EntityTooLarge' || errJson?.message?.includes('exceeded the maximum allowed size')) {
              errDetail = `O arquivo possui ${(file.size / (1024 * 1024)).toFixed(1)} MB e ultrapassa o limite de 50 MB do Supabase. Comprima o vídeo para menos de 50 MB.`;
            } else if (errJson?.message) {
              errDetail = errJson.message;
            }
          } catch (_) {}
          throw new Error(`Erro ao transferir vídeo para a nuvem: ${errDetail}`);
        }

        // Determinar horário agendado
        const scheduledTimeIso = publishNow
          ? new Date().toISOString()
          : calculatedSlots[i]?.isoString || new Date().toISOString();

        // 3. Criar registro do post com a URL pública oficial
        const postRes = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_id: activeAccount.id,
            title: file.name.replace(/\.[^/.]+$/, ''),
            caption: caption || activeAccount.default_caption || '',
            hashtags: hashtags ? hashtags.split(' ').map((h) => h.replace('#', '')) : [],
            video_url: urlData.publicUrl,
            video_filename: file.name,
            file_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
            status: publishNow ? 'processing' : 'scheduled',
            scheduled_for: scheduledTimeIso,
          }),
        });

        const postData = await postRes.json();
        if (!postRes.ok) {
          throw new Error(postData.error || 'Erro ao registrar agendamento.');
        }

        // 4. Se o usuário clicou em Publicar Agora, disparar imediatamente
        if (publishNow && postData.post?.id) {
          setSuccessMsg(`Publicando ${file.name} no Instagram e Facebook via API...`);
          const pubRes = await fetch('/api/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId: postData.post.id }),
          });
          const pubData = await pubRes.json();
          if (!pubData.success && pubData.status !== 'processing') {
            throw new Error(`Erro ao publicar: ${pubData.error || pubData.post?.error_message || 'Falha na API da Meta.'}`);
          }

          // Se a Meta estiver codificando o vídeo no Instagram, aguardar com checagem suave
          if (pubData.status === 'processing') {
            setSuccessMsg(`Vídeo enviado para a Meta! Finalizando codificação do Reel...`);
            let isDone = false;
            let attempts = 0;
            const maxPoll = 25; // até ~75s

            while (!isDone && attempts < maxPoll) {
              await new Promise((r) => setTimeout(r, 3000));
              attempts++;
              try {
                const pollRes = await fetch('/api/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ postId: postData.post.id }),
                });
                const pollData = await pollRes.json();
                if (pollData.status === 'published') {
                  isDone = true;
                  break;
                } else if (pollData.status === 'failed') {
                  throw new Error(pollData.error || 'Falha no processamento do vídeo na Meta.');
                } else {
                  setSuccessMsg(`Aguardando Meta finalizar codificação do Reel (${attempts * 3}s)...`);
                }
              } catch (pollErr: any) {
                console.warn('Aguardando Meta processar:', pollErr);
              }
            }
          }
        }
      }

      setSuccessMsg(
        publishNow
          ? 'Vídeo publicado com sucesso no Instagram e Facebook!'
          : `${files.length} vídeo(s) distribuído(s) e agendado(s) com sucesso na grade!`
      );
      setFiles([]);
      setScheduleDate(getNowDateStr());
      setScheduleTime(getNowTimeStr());
      onPostCreated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar envio.');
    } finally {
      setIsUploading(false);
    }
  };

  const daysLabels = [
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
    { id: 0, label: 'Dom' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            Upload em Lote & Agendador Inteligente
          </h2>
          <p className="text-xs text-gray-400">
            Arraste múltiplos vídeos para agendar na grade ou disparar no Instagram e Facebook via Meta API
          </p>
        </div>

        {/* Selected Destinations Tag & Preset Action */}
        <div className="flex items-center gap-2">
          {activeAccount && (
            <div className="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800 text-xs">
              <span className="text-gray-400">Destino:</span>
              <span className="font-semibold text-white truncate max-w-[140px]">{activeAccount.name}</span>
              <div className="flex items-center gap-1 ml-1 text-indigo-400">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <Facebook className="w-3.5 h-3.5 text-blue-400" />
              </div>
            </div>
          )}

          {activeAccount && (
            <button
              type="button"
              onClick={handleApplyPreset}
              className="text-xs bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Legenda Padrão</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-400 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Dropzone & Selected Files */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-3xl p-6 text-center cursor-pointer transition-all bg-gray-950/40 hover:bg-gray-950/80 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFilesSelect}
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-2.5 text-indigo-400 transition">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-semibold text-white mb-0.5">
              Clique ou arraste vídeos (.MP4, .MOV)
            </h3>
            <p className="text-[11px] text-gray-400">
              Você pode selecionar vários vídeos de uma vez (máx. 50 MB por vídeo)
            </p>
          </div>

          {/* Selected Files List with Slots Preview */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 flex items-center justify-between">
                <span>Vídeos Selecionados ({files.length})</span>
                <span className="text-[10px] text-indigo-400 normal-case font-normal">
                  {scheduleMode === 'batch_grid' ? 'Distribuídos na Grade' : 'Mesmo Horário'}
                </span>
              </div>
              {files.map((file, idx) => {
                const isOversized = file.size > 50 * 1024 * 1024;
                const slot = previewSlots[idx];
                return (
                  <div
                    key={idx}
                    className={`bg-gray-950 border rounded-xl p-2.5 flex items-center justify-between text-xs transition ${
                      isOversized ? 'border-rose-500/50 bg-rose-950/20' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                      <Film className={`w-4 h-4 flex-shrink-0 ${isOversized ? 'text-rose-400' : 'text-indigo-400'}`} />
                      <div className="truncate flex-1">
                        <div className="text-gray-200 truncate font-medium text-[11px]">{file.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                          {slot && (
                            <span className="text-indigo-400 bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-900/40 font-mono">
                              📅 {slot.dateStr} às {slot.timeStr}
                            </span>
                          )}
                          {isOversized && <span className="text-rose-400 font-bold">⚠️ Excede 50MB</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-gray-500 hover:text-rose-400 p-1 rounded-md transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Captions, Schedule & Action Panel */}
        <div className="lg:col-span-7 space-y-4">
          {/* Legenda & Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Legenda da Postagem
              </label>
              <span className="text-[10px] text-gray-500 font-mono">{caption.length}/2200</span>
            </div>

            <textarea
              rows={3}
              placeholder="Digite a legenda que acompanhará o vídeo nos Reels..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
            />

            {/* Quick Action Pills for Caption */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Smile className="w-3 h-3" /> Emojis rápidos:
              </span>
              {['✨', '🔥', '👉', '💡', '💬', '🚀', '👇'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleInsertEmoji(emoji)}
                  className="text-xs bg-gray-950 hover:bg-gray-800 border border-gray-800 px-1.5 py-0.5 rounded-md transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Hashtags with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-indigo-400" />
                Hashtags
              </label>
            </div>
            <input
              type="text"
              placeholder="#viral #reels #brasil #dicas"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            {/* Quick Preset Hashtags */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleInsertHashtagPreset('#reels #viral #explore #dicas #saude')}
                className="text-[10px] bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded-md transition flex items-center gap-1"
              >
                <Flame className="w-2.5 h-2.5 text-amber-400" /> + Viral & Dicas
              </button>
              <button
                type="button"
                onClick={() => handleInsertHashtagPreset('#suplementos #qualidadedevida #bemestar #saudavel')}
                className="text-[10px] bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded-md transition"
              >
                + Saúde & Suplementos
              </button>
            </div>
          </div>

          {/* Scheduling Configuration - SpeedPost Inspired */}
          <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800/80 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">Configuração de Agendamento</span>
                <button
                  type="button"
                  onClick={handleSaveSchedulePreset}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition flex items-center gap-1 ${
                    savedPresetMsg
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
                  }`}
                  title="Salvar esses horários e dias como padrão permanente"
                >
                  {savedPresetMsg ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Salvo como Padrão!
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Salvar Padrão
                    </>
                  )}
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-gray-900 p-0.5 rounded-xl border border-gray-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setScheduleMode('batch_grid')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    scheduleMode === 'batch_grid'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Grade Automática
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleMode('single')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    scheduleMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Horário Fixo
                </button>
              </div>
            </div>

            {/* Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {scheduleMode === 'single' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Horário da Postagem
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Adicionar Horário na Grade
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={newTimeInput}
                      onChange={(e) => setNewTimeInput(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddTimeSlot}
                      className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition"
                      title="Adicionar horário à grade"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Batch Grid Details (SpeedPost Style) */}
            {scheduleMode === 'batch_grid' && (
              <div className="space-y-3 pt-1">
                {/* Time Slots List */}
                <div>
                  <div className="text-[10px] text-gray-400 mb-1.5 font-medium flex items-center justify-between">
                    <span>Horários Diários ({gridTimes.length} disparos por dia):</span>
                    <span className="text-[9px] text-gray-500">Vídeos serão distribuídos nesses slots</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {gridTimes.map((t) => (
                      <span
                        key={t}
                        className="bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-mono"
                      >
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {t}
                        {gridTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeSlot(t)}
                            className="text-indigo-400 hover:text-rose-400 transition ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Days of Week Toggle (SpeedPost Feature) */}
                <div>
                  <div className="text-[10px] text-gray-400 mb-1.5 font-medium">
                    Dias da semana para postar:
                  </div>
                  <div className="flex items-center gap-1">
                    {daysLabels.map((d) => {
                      const isActive = selectedDays.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDay(d.id)}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition border ${
                            isActive
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                              : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isUploading || files.length === 0}
              className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 border border-gray-700 shadow-md"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              {isUploading ? 'Agendando...' : files.length > 1 ? `Agendar ${files.length} na Grade` : 'Agendar na Grade'}
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
