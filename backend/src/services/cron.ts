import { supabase } from './supabase.js';
import { MetaPublisherService } from './meta_publisher.js';

let isPolling = false;

/**
 * Motor autônomo em nuvem para verificar e disparar agendamentos a cada 60 segundos
 * Funciona 24h por dia no Render, mesmo com o computador e navegador do usuário desligados!
 */
export function startAutonomousCloudScheduler() {
  console.log('[Cloud Scheduler] Motor autônomo iniciado (checa agendamentos a cada 60s)...');

  // Checagem imediata ao iniciar
  checkAndDispatchDuePosts();

  // Intervalo recorrente de 60 segundos
  setInterval(() => {
    checkAndDispatchDuePosts();
  }, 60 * 1000);
}

export async function checkAndDispatchDuePosts() {
  if (isPolling) return;
  isPolling = true;

  try {
    const nowIso = new Date().toISOString();

    // 1. Buscar contas conectadas
    const { data: accountsData } = await supabase.from('accounts').select('*');
    const accounts = accountsData || [];
    if (accounts.length === 0) {
      isPolling = false;
      return;
    }

    // 2. Finalizar posts que estão no status 'processing' (vídeo codificado pela Meta)
    const { data: processingPosts } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'processing');

    if (processingPosts && processingPosts.length > 0) {
      for (const post of processingPosts) {
        const account = accounts.find((a: any) => a.id === post.account_id);
        if (account?.facebook_page_token && post.meta_media_id && account.instagram_account_id) {
          try {
            // Verificar status do container no Instagram
            const checkUrl = `https://graph.facebook.com/v20.0/${post.meta_media_id}?fields=status_code,status&access_token=${account.facebook_page_token}`;
            const res = await fetch(checkUrl);
            const checkData: any = await res.json();

            if (checkData.status_code === 'FINISHED') {
              // Publicar container finalizado
              const pubUrl = `https://graph.facebook.com/v20.0/${account.instagram_account_id}/media_publish?creation_id=${post.meta_media_id}&access_token=${account.facebook_page_token}`;
              const pubRes = await fetch(pubUrl, { method: 'POST' });
              const pubData: any = await pubRes.json();

              if (pubData.id) {
                await supabase.from('posts').update({
                  status: 'published',
                  meta_media_id: pubData.id,
                  published_at: post.published_at || new Date().toISOString(),
                  error_message: null,
                }).eq('id', post.id);
                console.log(`[Cloud Scheduler] Post ${post.id} (${post.title}) finalizado com sucesso no Instagram!`);
              }
            } else if (checkData.status_code === 'ERROR' || checkData.status_code === 'EXPIRED') {
              await supabase.from('posts').update({
                status: 'failed',
                error_message: `Erro na codificação da Meta: ${JSON.stringify(checkData)}`,
              }).eq('id', post.id);
            }
          } catch (err: any) {
            console.warn('[Cloud Scheduler] Erro ao checar post em processamento:', err.message);
          }
        }
      }
    }

    // 3. Buscar posts agendados cujo horário já chegou ou passou
    const { data: duePosts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso);

    if (error) {
      console.error('[Cloud Scheduler] Erro ao buscar posts agendados:', error.message);
      isPolling = false;
      return;
    }

    if (duePosts && duePosts.length > 0) {
      console.log(`[Cloud Scheduler] Encontrados ${duePosts.length} post(s) prontos para disparo automático!`);

      for (const post of duePosts) {
        const account = accounts.find((a: any) => a.id === post.account_id);
        if (!account) {
          await supabase.from('posts').update({
            status: 'failed',
            error_message: 'Perfil de rede social não encontrado no sistema.',
          }).eq('id', post.id);
          continue;
        }

        const publishResults: Record<string, any> = {};

        // 3.1 Publicar no Facebook Reels
        if (account.post_to_facebook && account.facebook_page_id && account.facebook_page_token) {
          try {
            const fbRes = await MetaPublisherService.publishFacebookReel({
              platform: 'facebook',
              accountId: account.facebook_page_id,
              accessToken: account.facebook_page_token,
              videoUrl: post.video_url,
              caption: post.caption || '',
            });
            publishResults.facebook = fbRes;
          } catch (e: any) {
            publishResults.facebook_error = e.message;
          }
        }

        // 3.2 Publicar no Instagram Reels
        if (account.post_to_instagram && account.instagram_account_id && account.facebook_page_token) {
          try {
            const igRes = await MetaPublisherService.publishInstagramReel({
              platform: 'instagram',
              accountId: account.instagram_account_id,
              accessToken: account.facebook_page_token,
              videoUrl: post.video_url,
              caption: post.caption || '',
            });
            publishResults.instagram = igRes;
          } catch (e: any) {
            publishResults.instagram_error = e.message;
          }
        }

        const hasSuccess = !!(publishResults.facebook?.success || publishResults.instagram?.success);
        const isStillProcessing = publishResults.instagram?.status === 'processing';

        if (hasSuccess) {
          if (isStillProcessing) {
            await supabase.from('posts').update({
              status: 'processing',
              published_at: new Date().toISOString(),
              meta_video_id: publishResults.facebook?.mediaId || publishResults.facebook?.videoId,
              meta_media_id: publishResults.instagram?.containerId,
              error_message: null,
            }).eq('id', post.id);
            console.log(`[Cloud Scheduler] Post ${post.id} enviado! Instagram codificando Reel...`);
          } else {
            await supabase.from('posts').update({
              status: 'published',
              published_at: new Date().toISOString(),
              meta_video_id: publishResults.facebook?.mediaId || publishResults.facebook?.videoId,
              meta_media_id: publishResults.instagram?.mediaId,
              error_message: null,
            }).eq('id', post.id);
            console.log(`[Cloud Scheduler] Post ${post.id} publicado com sucesso em ambas as redes!`);
          }
        } else {
          await supabase.from('posts').update({
            status: 'failed',
            error_message: publishResults.facebook_error || publishResults.instagram_error || 'Falha ao publicar na API da Meta.',
          }).eq('id', post.id);
        }
      }
    }
  } catch (err: any) {
    console.error('[Cloud Scheduler Error]', err.message);
  } finally {
    isPolling = false;
  }
}
