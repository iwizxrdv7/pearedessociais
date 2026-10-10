import axios from 'axios';

export interface PublishReelParams {
  platform: 'instagram' | 'facebook';
  accountId: string; // instagram_account_id ou facebook_page_id
  accessToken: string;
  videoUrl: string;
  caption: string;
  scheduledTimestamp?: number; // Unix timestamp em segundos
}

export interface PublishResult {
  success: boolean;
  mediaId?: string;
  containerId?: string;
  status: 'published' | 'scheduled' | 'failed';
  error?: string;
}

/**
 * Publicador oficial de Reels via Meta Graph API v20.0 (100% Cloud / Fastify)
 */
export class MetaPublisherService {
  /**
   * Publica ou agenda Reel no Instagram
   */
  static async publishInstagramReel(params: PublishReelParams): Promise<PublishResult> {
    const { accountId, accessToken, videoUrl, caption, scheduledTimestamp } = params;

    try {
      // 1. Criar container de mídia do Reel com a URL pública do vídeo
      const containerParams: Record<string, string> = {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption || '',
        access_token: accessToken,
      };

      if (scheduledTimestamp) {
        containerParams.scheduled_publish_time = String(scheduledTimestamp);
      }

      const initUrl = `https://graph.facebook.com/v20.0/${accountId}/media`;
      const initRes = await axios.post(initUrl, null, { params: containerParams });

      const containerId = initRes.data?.id;
      if (!containerId) {
        throw new Error(`Falha ao criar container no Instagram: ${JSON.stringify(initRes.data)}`);
      }

      // 2. Aguardar processamento do container pela Meta (polling)
      let isReady = false;
      const maxAttempts = 30; // até 2.5 minutos

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));

        const statusUrl = `https://graph.facebook.com/v20.0/${containerId}`;
        const statusRes = await axios.get(statusUrl, {
          params: {
            fields: 'status_code,status',
            access_token: accessToken,
          },
        });

        const statusCode = statusRes.data?.status_code;

        if (statusCode === 'FINISHED') {
          isReady = true;
          break;
        }

        if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
          throw new Error(`Meta falhou no processamento do Reel: ${JSON.stringify(statusRes.data)}`);
        }
      }

      if (!isReady) {
        throw new Error('Tempo limite de processamento de vídeo no Instagram esgotado.');
      }

      // 3. Se foi agendado, o container já foi programado nativamente pela Meta
      if (scheduledTimestamp) {
        return {
          success: true,
          containerId,
          status: 'scheduled',
        };
      }

      // 4. Se for publicação imediata, despacha a publicação do container
      const publishUrl = `https://graph.facebook.com/v20.0/${accountId}/media_publish`;
      const pubRes = await axios.post(publishUrl, null, {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      });

      return {
        success: true,
        containerId,
        mediaId: pubRes.data?.id,
        status: 'published',
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message;
      return {
        success: false,
        status: 'failed',
        error: errMsg,
      };
    }
  }

  /**
   * Publica ou agenda Reel no Facebook Pages
   */
  static async publishFacebookReel(params: PublishReelParams): Promise<PublishResult> {
    const { accountId, accessToken, videoUrl, caption, scheduledTimestamp } = params;

    try {
      // 1. Iniciar sessão de upload de Reel na Página do Facebook
      const initUrl = `https://graph.facebook.com/v20.0/${accountId}/video_reels`;
      const initRes = await axios.post(initUrl, {
        upload_phase: 'start',
        access_token: accessToken,
      });

      const videoId = initRes.data?.video_id;
      const uploadUrl = initRes.data?.upload_url;

      if (!videoId || !uploadUrl) {
        throw new Error(`Erro ao iniciar sessão no Facebook: ${JSON.stringify(initRes.data)}`);
      }

      // 2. Transferir vídeo via stream a partir da URL pública
      const videoStream = await axios.get(videoUrl, { responseType: 'stream' });
      await axios.post(uploadUrl, videoStream.data, {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          offset: '0',
          'Content-Type': 'application/octet-stream',
        },
      });

      // 3. Finalizar e Publicar ou Agendar
      const finishPayload: Record<string, any> = {
        upload_phase: 'finish',
        video_id: videoId,
        description: caption,
        access_token: accessToken,
        video_state: scheduledTimestamp ? 'SCHEDULED' : 'PUBLISHED',
      };

      if (scheduledTimestamp) {
        finishPayload.scheduled_publish_time = scheduledTimestamp;
      }

      await axios.post(initUrl, finishPayload);

      return {
        success: true,
        mediaId: videoId,
        status: scheduledTimestamp ? 'scheduled' : 'published',
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || err.message;
      return {
        success: false,
        status: 'failed',
        error: errMsg,
      };
    }
  }
}
