import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { MetaPublisherService, PublishReelParams } from './meta_publisher.js';
import { supabase } from './supabase.js';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_TLS_URL;

export interface ReelScheduleJobData {
  postId: string;
  accountId: string;
  accountName: string;
  platform: 'instagram' | 'facebook';
  accessToken: string;
  targetId: string; // instagram_account_id ou facebook_page_id
  videoUrl: string;
  caption: string;
  scheduledTimeIso: string;
}

let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;

// Fallback em memória caso o Redis ainda não esteja provisionado
const memoryTimers = new Map<string, NodeJS.Timeout>();

export function initQueueSystem() {
  if (REDIS_URL) {
    try {
      console.log('[Queue] Conectando ao Redis para fila de agendamento em nuvem...');
      const connection = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: null,
      });

      bullQueue = new Queue('reels-scheduler', { connection });

      bullWorker = new Worker(
        'reels-scheduler',
        async (job: Job<ReelScheduleJobData>) => {
          console.log(`[Queue Worker] Processando disparo de Reel: Post ${job.data.postId} (${job.data.accountName})`);
          await processReelPublication(job.data);
        },
        { connection }
      );

      bullWorker.on('completed', (job) => {
        console.log(`[Queue Worker] Job ${job.id} concluído com sucesso!`);
      });

      bullWorker.on('failed', (job, err) => {
        console.error(`[Queue Worker] Job ${job?.id} falhou:`, err.message);
      });

      console.log('[Queue] Motor BullMQ + Redis ATIVO e operacional.');
      return;
    } catch (e) {
      console.warn('[Queue] Erro ao conectar ao Redis, ativando motor em memória:', e);
    }
  } else {
    console.log('[Queue] REDIS_URL não detectada. Motor em memória (Zero Config) ativado.');
  }
}

/**
 * Agenda um post para ser publicado no horário especificado
 */
export async function scheduleReelJob(data: ReelScheduleJobData): Promise<{ success: boolean; jobId: string }> {
  const scheduledTime = new Date(data.scheduledTimeIso).getTime();
  const now = Date.now();
  const delayMs = Math.max(0, scheduledTime - now);
  const jobId = `reel_${data.postId}_${Date.now()}`;

  // Se o Redis estiver ativo, enfileira no BullMQ
  if (bullQueue) {
    await bullQueue.add('publish-reel', data, {
      delay: delayMs,
      jobId,
      removeOnComplete: true,
    });
    console.log(`[Queue] Post ${data.postId} agendado no BullMQ com delay de ${(delayMs / 1000 / 60).toFixed(1)} min.`);
    return { success: true, jobId };
  }

  // Fallback em memória (Node.js Timer)
  const timer = setTimeout(async () => {
    console.log(`[Memory Timer] Disparando agendamento para Post ${data.postId}`);
    memoryTimers.delete(jobId);
    await processReelPublication(data);
  }, delayMs);

  memoryTimers.set(jobId, timer);
  console.log(`[Memory Timer] Post ${data.postId} agendado em memória para ${data.scheduledTimeIso}`);
  return { success: true, jobId };
}

/**
 * Executa a publicação do Reel e atualiza o Supabase
 */
async function processReelPublication(data: ReelScheduleJobData) {
  try {
    // 1. Atualizar status para 'processing'
    await supabase.from('posts').update({ status: 'processing' }).eq('id', data.postId);

    // 2. Chamar Meta Graph API
    let res;
    if (data.platform === 'instagram') {
      res = await MetaPublisherService.publishInstagramReel({
        platform: 'instagram',
        accountId: data.targetId,
        accessToken: data.accessToken,
        videoUrl: data.videoUrl,
        caption: data.caption,
      });
    } else {
      res = await MetaPublisherService.publishFacebookReel({
        platform: 'facebook',
        accountId: data.targetId,
        accessToken: data.accessToken,
        videoUrl: data.videoUrl,
        caption: data.caption,
      });
    }

    // 3. Atualizar status final no Supabase
    if (res.success) {
      await supabase.from('posts').update({
        status: 'published',
        published_at: new Date().toISOString(),
        meta_media_id: res.mediaId || res.containerId,
      }).eq('id', data.postId);
      console.log(`[Publish OK] Post ${data.postId} publicado com sucesso na Meta! Media ID: ${res.mediaId || res.containerId}`);
    } else {
      await supabase.from('posts').update({
        status: 'failed',
        error_message: res.error || 'Erro desconhecido na Meta API',
      }).eq('id', data.postId);
      console.error(`[Publish ERRO] Post ${data.postId} falhou: ${res.error}`);
    }
  } catch (err: any) {
    console.error(`[Publish ERRO Crítico] Post ${data.postId}:`, err.message);
    await supabase.from('posts').update({
      status: 'failed',
      error_message: err.message,
    }).eq('id', data.postId);
  }
}

/**
 * Retorna o status do sistema de filas
 */
export function getQueueStatus() {
  return {
    engine: bullQueue ? 'bullmq_redis' : 'in_memory_fallback',
    redis_connected: !!bullQueue,
    active_memory_timers: memoryTimers.size,
  };
}
