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
    const cleanedDir = path.join(process.cwd(), 'data', 'cleaned');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    if (!fs.existsSync(cleanedDir)) fs.mkdirSync(cleanedDir, { recursive: true });

    const inputPath = path.join(tempDir, `raw_${Date.now()}_${file.name}`);
    const outputPath = path.join(cleanedDir, `clean_${Date.now()}_${file.name}`);

    const bytes = await file.arrayBuffer();
    fs.writeFileSync(inputPath, Buffer.from(bytes));

    const result = await executePythonBridge(['metadata_clean', inputPath, outputPath]);

    // Limpar arquivo bruto
    try { fs.unlinkSync(inputPath); } catch {}

    return NextResponse.json({
      status: 'success',
      data: result,
      cleaned_path: outputPath,
      filename: `clean_${file.name}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao limpar metadados.' }, { status: 400 });
  }
}
