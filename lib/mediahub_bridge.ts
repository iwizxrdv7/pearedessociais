import { spawn } from 'child_process';
import path from 'path';

const PYTHON_SCRIPT = path.join(process.cwd(), 'lib', 'mediahub_runner.py');

export async function executePythonBridge(args: string[]): Promise<any> {
  // 1. Tentar bater no backend FastAPI se estiver rodando em localhost:8000
  const command = args[0];
  try {
    if (command === 'tiktok_analyze') {
      const res = await fetch('http://127.0.0.1:8000/api/tiktok/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: args[1], max_items: Number(args[2] || 0) }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data;
      }
    } else if (command === 'instagram_analyze') {
      const res = await fetch('http://127.0.0.1:8000/api/instagram/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: args[1], max_items: Number(args[2] || 0) }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.data;
      }
    }
  } catch (e) {
    // Fallback para execução direta em Python
  }

  // 2. Execução direta via Python CLI
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [PYTHON_SCRIPT, ...args]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.status === 'success') {
          resolve(parsed.data);
        } else {
          reject(new Error(parsed.message || 'Erro na execução Python'));
        }
      } catch (err) {
        reject(new Error(stderr || stdout || `Processo Python encerrou com código ${code}`));
      }
    });

    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
}
