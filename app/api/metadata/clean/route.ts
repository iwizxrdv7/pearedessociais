import { NextResponse } from 'next/server';
import { cleanMediaBytes } from '@/lib/pure_cleaner';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const inputBytes = new Uint8Array(await file.arrayBuffer());
    const { cleaned, removed } = cleanMediaBytes(inputBytes, file.name);

    return new Response(Buffer.from(cleaned), {
      status: 200,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="clean_${file.name}"`,
        'X-Removed-Tags': encodeURIComponent(removed.join('; ')),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao limpar metadados.' }, { status: 400 });
  }
}
