import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MetaAPIClient } from '@/lib/meta_api';
import { SocialAccount, VideoPost } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const nowIso = new Date().toISOString();

    // 1. Buscar posts agendados cujo horário já chegou ou passou
    const { data: duePosts, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Nenhum post pendente para disparo neste minuto.' });
    }

    // 2. Buscar contas para obter os tokens
    const { data: accountsData } = await supabaseAdmin.from('accounts').select('*');
    const accounts = (accountsData || []) as SocialAccount[];

    const results = [];

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
      if (hasSuccess) {
        await supabaseAdmin.from('posts').update({
          status: 'published',
          published_at: new Date().toISOString(),
          meta_video_id: publishDetails.facebook?.videoId,
          meta_media_id: publishDetails.instagram?.mediaId,
          error_message: null,
        }).eq('id', post.id);
        results.push({ id: post.id, title: post.title, status: 'published' });
      } else {
        await supabaseAdmin.from('posts').update({
          status: 'failed',
          error_message: publishDetails.facebook_error || publishDetails.instagram_error || 'Falha ao publicar via Cron.',
        }).eq('id', post.id);
        results.push({ id: post.id, title: post.title, status: 'failed', error: publishDetails });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
