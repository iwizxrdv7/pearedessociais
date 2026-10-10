import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import dotenv from 'dotenv';
import { supabase } from './services/supabase.js';
import { MetaPublisherService } from './services/meta_publisher.js';
import { initQueueSystem, scheduleReelJob, getQueueStatus, ReelScheduleJobData } from './services/queue.js';

dotenv.config();

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function bootstrap() {
  // Inicialização dos plugins
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500 MB max
    },
  });

  await server.register(sensible);

  // Inicializar motor de filas de agendamento (Redis / BullMQ)
  initQueueSystem();

  // ----------------- ROTAS DA API -----------------

  /**
   * Health Check
   */
  server.get('/api/health', async () => {
    return {
      status: 'online',
      cloud_engine: 'fastify_node',
      queue: getQueueStatus(),
      time: new Date().toISOString(),
    };
  });

  /**
   * Listar Contas Conectadas
   */
  server.get('/api/accounts', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw server.httpErrors.internalServerError(error.message);
    }
    return data || [];
  });

  /**
   * Publicação Imediata de Reel (Publicar Agora)
   */
  server.post('/api/publish/now', async (req) => {
    const body = req.body as {
      postId: string;
      accountId: string;
      platform: 'instagram' | 'facebook';
      videoUrl: string;
      caption: string;
    };

    if (!body.postId || !body.accountId || !body.videoUrl) {
      throw server.httpErrors.badRequest('postId, accountId e videoUrl são obrigatórios.');
    }

    // Buscar conta no Supabase
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', body.accountId)
      .single();

    if (accError || !account) {
      throw server.httpErrors.notFound('Conta de rede social não encontrada.');
    }

    let result;
    if (body.platform === 'instagram') {
      if (!account.instagram_account_id || !account.facebook_page_token) {
        throw server.httpErrors.badRequest('Conta do Instagram não vinculada ou sem token.');
      }
      result = await MetaPublisherService.publishInstagramReel({
        platform: 'instagram',
        accountId: account.instagram_account_id,
        accessToken: account.facebook_page_token,
        videoUrl: body.videoUrl,
        caption: body.caption || account.default_caption || '',
      });
    } else {
      if (!account.facebook_page_id || !account.facebook_page_token) {
        throw server.httpErrors.badRequest('Página do Facebook não configurada ou sem token.');
      }
      result = await MetaPublisherService.publishFacebookReel({
        platform: 'facebook',
        accountId: account.facebook_page_id,
        accessToken: account.facebook_page_token,
        videoUrl: body.videoUrl,
        caption: body.caption || account.default_caption || '',
      });
    }

    // Atualizar post no Supabase
    if (result.success) {
      await supabase.from('posts').update({
        status: 'published',
        published_at: new Date().toISOString(),
        meta_media_id: result.mediaId || result.containerId,
      }).eq('id', body.postId);
    } else {
      await supabase.from('posts').update({
        status: 'failed',
        error_message: result.error,
      }).eq('id', body.postId);
    }

    return { success: result.success, details: result };
  });

  /**
   * Agendamento em Lote estilo SpeedPost (createV2Batch)
   */
  server.post('/api/scheduler/batch', async (req) => {
    const body = req.body as {
      items: Array<{
        postId?: string;
        accountId: string;
        title?: string;
        caption?: string;
        videoUrl: string;
        scheduledFor: string; // ISO date string
        platform?: 'instagram' | 'facebook';
      }>;
    };

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      throw server.httpErrors.badRequest('Lista de itens de agendamento é obrigatória.');
    }

    // Buscar contas
    const { data: accounts } = await supabase.from('accounts').select('*');
    const accountsMap = new Map((accounts || []).map((a) => [a.id, a]));

    const scheduledResults = [];

    for (const item of body.items) {
      const account = accountsMap.get(item.accountId);
      if (!account) continue;

      const postId = item.postId || `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const platform = item.platform || (account.post_to_instagram ? 'instagram' : 'facebook');
      const targetId = platform === 'instagram' ? account.instagram_account_id : account.facebook_page_id;

      // 1. Salvar ou atualizar registro no Supabase
      await supabase.from('posts').upsert({
        id: postId,
        account_id: account.id,
        account_name: account.name,
        title: item.title || 'Reel Agendado',
        caption: item.caption || account.default_caption || '',
        video_url: item.videoUrl,
        status: 'scheduled',
        scheduled_for: item.scheduledFor,
        created_at: new Date().toISOString(),
      });

      // 2. Enfileirar no BullMQ/Redis
      if (targetId && account.facebook_page_token) {
        const jobData: ReelScheduleJobData = {
          postId,
          accountId: account.id,
          accountName: account.name,
          platform,
          accessToken: account.facebook_page_token,
          targetId,
          videoUrl: item.videoUrl,
          caption: item.caption || account.default_caption || '',
          scheduledTimeIso: item.scheduledFor,
        };

        const scheduled = await scheduleReelJob(jobData);
        scheduledResults.push({ postId, scheduled: true, jobId: scheduled.jobId });
      }
    }

    return {
      success: true,
      total_scheduled: scheduledResults.length,
      results: scheduledResults,
    };
  });

  /**
   * Status da Fila
   */
  server.get('/api/queue/status', async () => {
    return getQueueStatus();
  });

  // Inicialização do Servidor
  const PORT = Number(process.env.PORT) || 8000;
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[Fastify] Servidor rodando em http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('[Fastify Fatal Error]', err);
  process.exit(1);
});
