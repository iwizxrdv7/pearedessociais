import { NextResponse } from 'next/server';
import { getAccountsAsync, getPostsAsync, savePostAsync } from '@/lib/storage';
import { MetaAPIClient } from '@/lib/meta_api';
import path from 'path';
import fs from 'fs';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { postId, scheduleTimestamp } = await req.json();
    const posts = await getPostsAsync();
    const post = posts.find((p) => p.id === postId);

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    const accounts = await getAccountsAsync();
    const account = accounts.find((a) => a.id === post.account_id);

    if (!account) {
      return NextResponse.json({ error: 'Perfil de rede social não encontrado.' }, { status: 404 });
    }

    // Se o post já está no estado 'processing' e tem um container ID do Instagram aguardando:
    if (post.status === 'processing' && post.meta_media_id && account.facebook_page_token && account.instagram_account_id) {
      const containerId = post.meta_media_id;
      try {
        const check = await MetaAPIClient.checkInstagramContainerStatus(containerId, account.facebook_page_token);
        if (check.statusCode === 'FINISHED') {
          // Publicar container finalizado
          const pub = await MetaAPIClient.publishInstagramContainer(account.instagram_account_id, containerId, account.facebook_page_token);
          post.status = 'published';
          post.meta_media_id = pub.mediaId;
          post.published_at = post.published_at || new Date().toISOString();
          post.error_message = undefined;
          await savePostAsync(post);
          return NextResponse.json({ success: true, status: 'published', post, message: 'Reel publicado no Instagram com sucesso!' });
        } else if (check.statusCode === 'ERROR' || check.statusCode === 'EXPIRED') {
          post.status = 'failed';
          post.error_message = `Erro na codificação do vídeo no Instagram: ${JSON.stringify(check.data)}`;
          await savePostAsync(post);
          return NextResponse.json({ success: false, status: 'failed', post, error: post.error_message });
        } else {
          // Ainda processando na Meta
          return NextResponse.json({ success: true, status: 'processing', post, message: 'Aguardando Meta processar codificação do vídeo...' });
        }
      } catch (err: any) {
        return NextResponse.json({ success: true, status: 'processing', post, message: 'Processando na Meta...' });
      }
    }

    let videoFilePath = post.video_url;
    const isRemote = videoFilePath && (videoFilePath.startsWith('http://') || videoFilePath.startsWith('https://'));

    if (!isRemote && !fs.existsSync(videoFilePath)) {
      // Tentar resolver na pasta de fila local caso exista no host
      const profileFolder = path.join(process.cwd(), '..', 'Perfis', account.name, '2_Fila_Para_Postar', post.video_filename);
      if (fs.existsSync(profileFolder)) {
        videoFilePath = profileFolder;
      }
    }

    const results: Record<string, any> = {};

    // 1. Postar no Facebook se ativado
    if (account.post_to_facebook && account.facebook_page_id && account.facebook_page_token) {
      try {
        const fbRes = await MetaAPIClient.publishFacebookReel({
          pageId: account.facebook_page_id,
          pageToken: account.facebook_page_token,
          videoFilePath,
          caption: post.caption,
          scheduledTimestamp: scheduleTimestamp,
        });
        results.facebook = fbRes;
      } catch (fbErr: any) {
        results.facebook_error = fbErr.message;
      }
    }

    // 2. Postar no Instagram se ativado e vinculado
    if (account.post_to_instagram && account.instagram_account_id && account.facebook_page_token) {
      try {
        const igRes = await MetaAPIClient.publishInstagramReel({
          igAccountId: account.instagram_account_id,
          pageToken: account.facebook_page_token,
          videoFilePath,
          caption: post.caption,
          scheduledTimestamp: scheduleTimestamp,
        });
        results.instagram = igRes;
      } catch (igErr: any) {
        results.instagram_error = igErr.message;
      }
    }

    // Atualizar status do post
    const hasSuccess = !!(results.facebook || results.instagram);
    const isStillProcessing = results.instagram?.status === 'processing';

    if (hasSuccess) {
      if (isStillProcessing) {
        post.status = 'processing';
        post.published_at = new Date().toISOString();
        post.meta_video_id = results.facebook?.videoId;
        post.meta_media_id = results.instagram?.containerId;
        post.error_message = undefined;
      } else {
        post.status = scheduleTimestamp ? 'scheduled' : 'published';
        post.published_at = scheduleTimestamp ? undefined : new Date().toISOString();
        post.meta_video_id = results.facebook?.videoId;
        post.meta_media_id = results.instagram?.mediaId;
        post.error_message = undefined;
      }
    } else {
      post.status = 'failed';
      post.error_message = results.facebook_error || results.instagram_error || 'Falha ao publicar na API.';
    }

    await savePostAsync(post);
    return NextResponse.json({
      success: hasSuccess,
      status: post.status,
      post,
      details: results,
      message: isStillProcessing
        ? 'Publicado no Facebook! Processando vídeo no Instagram...'
        : 'Publicado com sucesso no Facebook e Instagram!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
