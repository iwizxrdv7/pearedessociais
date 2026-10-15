import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MetaAPIClient } from '@/lib/meta_api';
import { SocialAccount, VideoPost } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const nowIso = new Date().toISOString();

    // 1. Buscar contas para obter os tokens
    const { data: accountsData } = await supabaseAdmin.from('accounts').select('*');
    const accounts = (accountsData || []) as SocialAccount[];
    const results = [];

    // 2. Checar e finalizar posts que estão no status 'processing'
    const { data: processingPosts } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'processing');

    if (processingPosts && processingPosts.length > 0) {
      for (const post of processingPosts as VideoPost[]) {
        const account = accounts.find((a) => a.id === post.account_id);
        if (account?.facebook_page_token && post.meta_media_id) {
          try {
            const check = await MetaAPIClient.checkInstagramContainerStatus(post.meta_media_id, account.facebook_page_token);
            if (check.statusCode === 'FINISHED' && account.instagram_account_id) {
              const pub = await MetaAPIClient.publishInstagramContainer(account.instagram_account_id, post.meta_media_id, account.facebook_page_token);
              await supabaseAdmin.from('posts').update({
                status: 'published',
                meta_media_id: pub.mediaId,
                published_at: post.published_at || new Date().toISOString(),
                error_message: null,
              }).eq('id', post.id);
              results.push({ id: post.id, title: post.title, status: 'published_from_processing' });
            } else if (check.statusCode === 'ERROR' || check.statusCode === 'EXPIRED') {
              await supabaseAdmin.from('posts').update({
                status: 'failed',
                error_message: `Erro no processamento da Meta: ${JSON.stringify(check.data)}`,
              }).eq('id', post.id);
            } else if (!check.statusCode && check.data?.error?.code === 100) {
              // Se o status_code não existe mais, é porque o container já virou uma mídia publicada no Instagram
              await supabaseAdmin.from('posts').update({
                status: 'published',
                published_at: post.published_at || new Date().toISOString(),
                error_message: null,
              }).eq('id', post.id);
              results.push({ id: post.id, title: post.title, status: 'published_from_verified_media' });
            }
          } catch (e: any) {
            console.warn('Erro ao checar post em processamento:', e);
          }
        }
      }
    }

    // 3. Buscar posts agendados cujo horário já chegou ou passou
    const { data: duePosts, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (duePosts && duePosts.length > 0) {
      for (const post of duePosts as VideoPost[]) {
        const account = accounts.find((a) => a.id === post.account_id);
        if (!account) {
          await supabaseAdmin.from('posts').update({
            status: 'failed',
            error_message: 'Perfil de rede social não encontrado no sistema.'
          }).eq('id', post.id);
          continue;
        }

        const publishDetails: Record<string, any> = {};

        // Postar no Facebook se ativado
        if (account.post_to_facebook && account.facebook_page_id && account.facebook_page_token) {
          try {
            const fbRes = await MetaAPIClient.publishFacebookReel({
              pageId: account.facebook_page_id,
              pageToken: account.facebook_page_token,
              videoFilePath: post.video_url,
              caption: post.caption,
            });
            publishDetails.facebook = fbRes;
          } catch (e: any) {
            publishDetails.facebook_error = e.message;
          }
        }

        // Postar no Instagram se ativado
        if (account.post_to_instagram && account.instagram_account_id && account.facebook_page_token) {
          try {
            const igRes = await MetaAPIClient.publishInstagramReel({
              igAccountId: account.instagram_account_id,
              pageToken: account.facebook_page_token,
              videoFilePath: post.video_url,
              caption: post.caption,
            });
            publishDetails.instagram = igRes;
          } catch (e: any) {
            publishDetails.instagram_error = e.message;
          }
        }

        const hasSuccess = !!(publishDetails.facebook || publishDetails.instagram);
        const isStillProcessing = publishDetails.instagram?.status === 'processing';

        if (hasSuccess) {
          if (isStillProcessing) {
            await supabaseAdmin.from('posts').update({
              status: 'processing',
              published_at: new Date().toISOString(),
              meta_video_id: publishDetails.facebook?.videoId,
              meta_media_id: publishDetails.instagram?.containerId,
              error_message: null,
            }).eq('id', post.id);
            results.push({ id: post.id, title: post.title, status: 'processing' });
          } else {
            await supabaseAdmin.from('posts').update({
              status: 'published',
              published_at: new Date().toISOString(),
              meta_video_id: publishDetails.facebook?.videoId,
              meta_media_id: publishDetails.instagram?.mediaId,
              error_message: null,
            }).eq('id', post.id);
            results.push({ id: post.id, title: post.title, status: 'published' });
          }
        } else {
          await supabaseAdmin.from('posts').update({
            status: 'failed',
            error_message: publishDetails.facebook_error || publishDetails.instagram_error || 'Falha ao publicar via Cron.',
          }).eq('id', post.id);
          results.push({ id: post.id, title: post.title, status: 'failed', error: publishDetails });
        }
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
