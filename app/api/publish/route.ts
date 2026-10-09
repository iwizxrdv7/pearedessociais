import { NextResponse } from 'next/server';
import { getAccounts, getPosts, savePosts } from '@/lib/storage';
import { MetaAPIClient } from '@/lib/meta_api';
import path from 'path';
import fs from 'fs';

export async function POST(req: Request) {
  try {
    const { postId, scheduleTimestamp } = await req.json();
    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);

    if (!post) {
      return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
    }

    const accounts = getAccounts();
    const account = accounts.find((a) => a.id === post.account_id);

    if (!account) {
      return NextResponse.json({ error: 'Perfil de rede social não encontrado.' }, { status: 404 });
    }

    // Identificar caminho do vídeo local ou storage
    let videoFilePath = post.video_url;
    if (!fs.existsSync(videoFilePath)) {
      // Tentar resolver na pasta de fila do perfil no sistema
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
    const hasSuccess = results.facebook || results.instagram;
    if (hasSuccess) {
      post.status = scheduleTimestamp ? 'scheduled' : 'published';
      post.published_at = scheduleTimestamp ? undefined : new Date().toISOString();
      post.meta_video_id = results.facebook?.videoId;
      post.meta_media_id = results.instagram?.mediaId;
    } else {
      post.status = 'failed';
      post.error_message = results.facebook_error || results.instagram_error || 'Falha ao publicar na API.';
    }

    savePosts(posts);
    return NextResponse.json({ success: hasSuccess, post, details: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
