import { NextResponse } from 'next/server';
import { executePythonBridge } from '@/lib/mediahub_bridge';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), 'data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempPath = path.join(tempDir, `inspect_${Date.now()}_${file.name}`);
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(tempPath, Buffer.from(bytes));

    const metadata = await executePythonBridge(['metadata_inspect', tempPath]);
    
    // Limpar arquivo temporário de inspeção
    try { fs.unlinkSync(tempPath); } catch {}

    return NextResponse.json({ status: 'success', data: metadata });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao inspecionar metadados.' }, { status: 400 });
  }
}
