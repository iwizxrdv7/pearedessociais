import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: 'Nome do arquivo é obrigatório.' }, { status: 400 });
    }

    const extMatch = filename.match(/\.[a-zA-Z0-9]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : '.mp4';
    const nameWithoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, '');
    const cleanBase = nameWithoutExt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 80);
    const storagePath = `reels/${Date.now()}_${cleanBase}${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('videos')
      .createSignedUploadUrl(storagePath, { upsert: true });

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Falha ao criar URL de upload seguro.' }, { status: 500 });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
      publicUrl: publicData.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
