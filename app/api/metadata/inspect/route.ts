import { NextResponse } from 'next/server';
import { inspectMediaBytes } from '@/lib/pure_cleaner';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const metadata = inspectMediaBytes(bytes, file.name);

    return NextResponse.json({ status: 'success', data: metadata });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao inspecionar metadados.' }, { status: 400 });
  }
}
