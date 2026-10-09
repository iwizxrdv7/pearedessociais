import { NextResponse } from 'next/server';
import { getPostsAsync, savePostAsync, deletePostAsync, getAccountsAsync } from '@/lib/storage';
import { VideoPost } from '@/lib/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  const status = searchParams.get('status');

  let posts = await getPostsAsync();
  if (accountId) {
    posts = posts.filter((p) => p.account_id === accountId);
  }
  if (status) {
    posts = posts.filter((p) => p.status === status);
  }

  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  try {
    const postData: Partial<VideoPost> = await req.json();
    if (!postData.account_id || !postData.video_url) {
      return NextResponse.json({ error: 'Conta e Vídeo são obrigatórios.' }, { status: 400 });
    }

    const accounts = await getAccountsAsync();
    const account = accounts.find((a) => a.id === postData.account_id);

    const newPost: VideoPost = {
      id: postData.id || `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      account_id: postData.account_id,
      account_name: account ? account.name : 'Conta Padrão',
      title: postData.title || 'Novo Reel',
      caption: postData.caption || '',
      hashtags: postData.hashtags || [],
      video_url: postData.video_url,
      video_filename: postData.video_filename || 'video.mp4',
      file_size_mb: postData.file_size_mb || 0,
      thumbnail_url: postData.thumbnail_url,
      status: postData.status || 'queued',
      scheduled_for: postData.scheduled_for,
      created_at: new Date().toISOString(),
    };

    await savePostAsync(newPost);
    return NextResponse.json({ success: true, post: newPost });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do post é obrigatório.' }, { status: 400 });
    }

    await deletePostAsync(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
