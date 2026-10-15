import fs from 'fs';
import path from 'path';

export interface MetaPublishParams {
  pageId?: string;
  pageToken?: string;
  igAccountId?: string;
  videoFilePath?: string;
  videoBuffer?: Buffer;
  videoUrl?: string;
  caption: string;
  scheduledTimestamp?: number; // Unix timestamp in seconds
}

export class MetaAPIClient {
  /**
   * Publica ou agenda um Reel no Facebook
   */
  static async publishFacebookReel(params: MetaPublishParams): Promise<{ videoId: string; status: string; data: any }> {
    const { pageId, pageToken, videoFilePath, videoUrl, caption, scheduledTimestamp } = params;
    if (!pageId || !pageToken) {
      throw new Error("Facebook Page ID e Token são obrigatórios.");
    }

    const effectiveUrl = videoUrl || (videoFilePath?.startsWith('http') ? videoFilePath : null);

    // Se tiver URL pública na nuvem (Supabase Storage)
    if (effectiveUrl) {
      const fbUrl = `https://graph.facebook.com/v20.0/${pageId}/videos`;
      const body: Record<string, any> = {
        file_url: effectiveUrl,
        description: caption || '',
        access_token: pageToken,
      };
      if (scheduledTimestamp) {
        body.published = false;
        body.scheduled_publish_time = scheduledTimestamp;
      }

      const res = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.id) {
        throw new Error(`Erro ao publicar no Facebook via URL: ${JSON.stringify(data)}`);
      }
      return {
        videoId: data.id,
        status: scheduledTimestamp ? 'scheduled' : 'published',
        data,
      };
    }

    // Se for arquivo local em disco
    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      throw new Error(`Arquivo de vídeo não encontrado no caminho: ${videoFilePath}`);
    }

    const fileStats = fs.statSync(videoFilePath);
    const fileSize = fileStats.size;

    // 1. Iniciar sessão de upload de Reel
    const initRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_phase: 'start',
        access_token: pageToken,
      }),
    });
    const initData = await initRes.json();
    if (!initData.video_id || !initData.upload_url) {
      throw new Error(`Erro ao iniciar sessão no Facebook: ${JSON.stringify(initData)}`);
    }

    const videoId = initData.video_id;
    const uploadUrl = initData.upload_url;

    // 2. Transferir bytes do vídeo
    const videoBuffer = fs.readFileSync(videoFilePath);
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${pageToken}`,
        'offset': '0',
        'file_size': String(fileSize),
        'Content-Type': 'application/octet-stream',
      },
      body: videoBuffer,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Erro na transferência do vídeo no Facebook: ${errText}`);
    }

    // 3. Finalizar e Publicar / Agendar
    const finishBody: Record<string, any> = {
      upload_phase: 'finish',
      video_id: videoId,
      description: caption,
      access_token: pageToken,
    };

    if (scheduledTimestamp) {
      finishBody.video_state = 'SCHEDULED';
      finishBody.scheduled_publish_time = scheduledTimestamp;
    } else {
      finishBody.video_state = 'PUBLISHED';
    }

    const finishRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finishBody),
    });
    const finishData = await finishRes.json();

    return {
      videoId,
      status: scheduledTimestamp ? 'scheduled' : 'published',
      data: finishData,
    };
  }

  /**
   * Publica ou agenda um Reel no Instagram
   */
  static async publishInstagramReel(params: MetaPublishParams): Promise<{ mediaId?: string; containerId: string; status: string }> {
    const { pageToken, igAccountId, videoFilePath, videoUrl, caption, scheduledTimestamp } = params;
    if (!igAccountId || !pageToken) {
      throw new Error("Instagram Account ID e Page Token são obrigatórios.");
    }

    const effectiveUrl = videoUrl || (videoFilePath?.startsWith('http') ? videoFilePath : null);

    let containerId: string;

    // Se tiver URL pública (Supabase Storage)
    if (effectiveUrl) {
      const containerRes = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: effectiveUrl,
          caption: caption || '',
          access_token: pageToken,
        }),
      });
      const containerData = await containerRes.json();
      if (!containerData.id) {
        throw new Error(`Erro ao criar container no Instagram via URL: ${JSON.stringify(containerData)}`);
      }
      containerId = containerData.id;
    } else {
      // Se for arquivo local
      if (!videoFilePath || !fs.existsSync(videoFilePath)) {
        throw new Error(`Arquivo de vídeo não encontrado no caminho: ${videoFilePath}`);
      }

      const fileStats = fs.statSync(videoFilePath);
      const fileSize = fileStats.size;

      // 1. Criar container Resumable
      const containerParams = new URLSearchParams({
        media_type: 'REELS',
        upload_type: 'resumable',
        caption: caption || '',
        access_token: pageToken,
      });

      const containerRes = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media?${containerParams.toString()}`, {
        method: 'POST',
      });
      const containerData = await containerRes.json();
      if (!containerData.id || !containerData.uri) {
        throw new Error(`Erro ao criar container no Instagram: ${JSON.stringify(containerData)}`);
      }

      containerId = containerData.id;
      const uploadUri = containerData.uri;

      // 2. Upload dos bytes
      const videoBuffer = fs.readFileSync(videoFilePath);
      const uploadRes = await fetch(uploadUri, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${pageToken}`,
          'offset': '0',
          'file_size': String(fileSize),
          'Content-Type': 'application/octet-stream',
        },
        body: videoBuffer,
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Erro na transferência para o Instagram: ${errText}`);
      }
    }

    // 3. Aguardar processamento da Meta (vídeos levam entre 15s e 45s para codificar)
    let isReady = false;
    const maxInitialChecks = 18; // 18 checagens a cada 2.5s = ~45s
    for (let i = 0; i < maxInitialChecks; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${pageToken}`);
      const statusData = await statusRes.json();
      
      if (statusData.status_code === 'FINISHED') {
        isReady = true;
        break;
      }
      if (statusData.status_code === 'ERROR' || statusData.status_code === 'EXPIRED') {
        throw new Error(`Erro no processamento do vídeo no Instagram: ${JSON.stringify(statusData)}`);
      }
    }

    // Se ainda está processando na Meta, não trave a requisição HTTP do servidor: retorne 'processing'
    if (!isReady) {
      return {
        containerId,
        status: 'processing',
      };
    }

    // 4. Se agendado, container pronto
    if (scheduledTimestamp) {
      return { containerId, status: 'scheduled' };
    }

    // Publicar imediatamente
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageToken,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishData.id) {
      throw new Error(`Erro ao publicar Reel no Instagram: ${JSON.stringify(publishData)}`);
    }

    return {
      mediaId: publishData.id,
      containerId,
      status: 'published',
    };
  }

  /**
   * Checa o status de processamento de um container de Reel no Instagram
   */
  static async checkInstagramContainerStatus(containerId: string, pageToken: string): Promise<{ statusCode: string; status: string; data: any }> {
    const res = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${pageToken}`);
    const data = await res.json();
    return {
      statusCode: data.status_code || '',
      status: data.status || '',
      data,
    };
  }

  /**
   * Publica um container que já concluiu o processamento na Meta
   */
  static async publishInstagramContainer(igAccountId: string, containerId: string, pageToken: string): Promise<{ mediaId: string }> {
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageToken,
      }),
    });
    const publishData = await publishRes.json();
    if (!publishData.id) {
      throw new Error(`Erro ao publicar Reel no Instagram: ${JSON.stringify(publishData)}`);
    }
    return { mediaId: publishData.id };
  }

  /**
   * Importa todas as páginas do Facebook e contas de Instagram a partir de um User Token
   */
  static async discoverAccounts(userToken: string, appId: string, appSecret: string) {
    // Troca para token de longa duração
    const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json();

    const longLivedToken = exchangeData.access_token || userToken;

    // Busca páginas do usuário
    const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&access_token=${longLivedToken}`;
    const pagesRes = await fetch(pagesUrl);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || !Array.isArray(pagesData.data)) {
      throw new Error(`Falha ao obter páginas da Meta: ${JSON.stringify(pagesData)}`);
    }

    return {
      longLivedToken,
      pages: pagesData.data,
    };
  }
}
