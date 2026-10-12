import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: 'Nome do arquivo é obrigatório.' }, { status: 400 });
    }

    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `reels/${Date.now()}_${cleanName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('videos')
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Falha ao criar URL de upload.' }, { status: 500 });
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
