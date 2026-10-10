import JSZip from 'jszip';
import { cleanMp4Bytes, cleanJpegBytes } from './pure_cleaner';

export async function fetchMediaBlob(mediaUrl: string): Promise<{ data: Uint8Array; mimeType: string }> {
  // Se for URL externa, usa o proxy da aplicação para contornar CORS e hotlinking
  const fetchUrl = mediaUrl.startsWith('http')
    ? `/api/media/proxy?url=${encodeURIComponent(mediaUrl)}`
    : mediaUrl;

  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`Não foi possível baixar mídia: ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return {
    data: new Uint8Array(arrayBuffer),
    mimeType: contentType,
  };
}

/**
 * Converte qualquer imagem em resolução exata HD de 1080px x 1080px via HTML5 Canvas.
 * A re-renderização em canvas gera uma matriz de pixels totalmente nova, eliminando
 * 100% de metadados, identificadores do Instagram/Meta, câmeras e GPS.
 */
export async function convertToCleanHd1080Image(imageBytes: Uint8Array): Promise<Uint8Array> {
  if (typeof window === 'undefined') {
    return cleanJpegBytes(imageBytes).cleaned;
  }

  return new Promise((resolve) => {
    const blob = new Blob([imageBytes as any], { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(blobUrl);
          resolve(cleanJpegBytes(imageBytes).cleaned);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const nw = img.naturalWidth || 150;
        const nh = img.naturalHeight || 150;

        // Super-Resolução Progressiva: Upscaling em múltiplos passos com interpolação suave
        // Evita a pixelização/quadriculado de saltos diretos em Canvas
        let currentCanvas: HTMLCanvasElement = document.createElement('canvas');
        currentCanvas.width = nw;
        currentCanvas.height = nh;
        let currentCtx = currentCanvas.getContext('2d')!;
        currentCtx.imageSmoothingEnabled = true;
        currentCtx.imageSmoothingQuality = 'high';
        currentCtx.drawImage(img, 0, 0);

        let curW = nw;
        let curH = nh;
        const targetW = 1080;
        const targetH = 1080;

        while (curW < targetW || curH < targetH) {
          const nextW = Math.min(targetW, Math.round(curW * 1.5));
          const nextH = Math.min(targetH, Math.round(curH * 1.5));
          const stepCanvas = document.createElement('canvas');
          stepCanvas.width = nextW;
          stepCanvas.height = nextH;
          const stepCtx = stepCanvas.getContext('2d')!;
          stepCtx.imageSmoothingEnabled = true;
          stepCtx.imageSmoothingQuality = 'high';
          stepCtx.drawImage(currentCanvas, 0, 0, curW, curH, 0, 0, nextW, nextH);
          currentCanvas = stepCanvas;
          curW = nextW;
          curH = nextH;
        }

        // Fundo neutro e centralização perfeita
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 1080, 1080);
        ctx.drawImage(currentCanvas, 0, 0, 1080, 1080);

        // Restauração de Nitidez Avançada: Unsharp Mask Convolution (3x3 Laplacian)
        // Elimina o aspecto embaçado e restaura bordas de alta frequência (rosto, cabelo, texto)
        try {
          const imgData = ctx.getImageData(0, 0, 1080, 1080);
          const pixels = imgData.data;
          const copy = new Uint8ClampedArray(pixels);
          const w = 1080;
          const h = 1080;
          const amount = 0.25; // Peso calibrado de nitidez cristalina sem ruído

          for (let y = 1; y < h - 1; y++) {
            const rowOffset = y * w;
            for (let x = 1; x < w - 1; x++) {
              const idx = (rowOffset + x) * 4;
              for (let c = 0; c < 3; c++) {
                const center = copy[idx + c];
                const up = copy[((y - 1) * w + x) * 4 + c];
                const down = copy[((y + 1) * w + x) * 4 + c];
                const left = copy[(rowOffset + x - 1) * 4 + c];
                const right = copy[(rowOffset + x + 1) * 4 + c];
                const laplacian = 4 * center - up - down - left - right;
                const sharpened = center + amount * laplacian;
                pixels[idx + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // Se houver restrição de segurança no context, prossegue com a imagem interpolada
        }

        canvas.toBlob(
          async (exportBlob) => {
            URL.revokeObjectURL(blobUrl);
            if (!exportBlob) {
              resolve(cleanJpegBytes(imageBytes).cleaned);
              return;
            }
            const buffer = await exportBlob.arrayBuffer();
            const freshBytes = new Uint8Array(buffer);
            const { cleaned } = cleanJpegBytes(freshBytes);
            resolve(cleaned);
          },
          'image/jpeg',
          0.98
        );
      } catch {
        URL.revokeObjectURL(blobUrl);
        resolve(cleanJpegBytes(imageBytes).cleaned);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(cleanJpegBytes(imageBytes).cleaned);
    };

    img.src = blobUrl;
  });
}

export async function downloadCleanSingleMedia(
  mediaUrl: string,
  suggestedName: string,
  isVideo: boolean = false,
  isAvatar: boolean = false
): Promise<void> {
  const { data, mimeType } = await fetchMediaBlob(mediaUrl);

  const isActuallyVideo = isVideo || mimeType.includes('video') || mediaUrl.includes('.mp4');
  const isProfileAvatar =
    isAvatar ||
    suggestedName.toLowerCase().includes('avatar') ||
    suggestedName.toLowerCase().includes('perfil');

  let cleaned: Uint8Array;
  let finalExt = isActuallyVideo ? 'mp4' : 'jpg';
  let finalMime = isActuallyVideo ? 'video/mp4' : 'image/jpeg';

  if (isActuallyVideo) {
    const res = cleanMp4Bytes(data);
    cleaned = res.cleaned;
  } else if (isProfileAvatar) {
    // Foto de Perfil: Renderiza em HD 1080x1080 e limpa metadados integralmente
    cleaned = await convertToCleanHd1080Image(data);
  } else {
    // Foto normal: Limpa metadados binários JPEG/PNG
    const res = cleanJpegBytes(data);
    cleaned = res.cleaned;
    if (mimeType.includes('png')) {
      finalExt = 'png';
      finalMime = 'image/png';
    }
  }

  const blob = new Blob([cleaned as any], { type: finalMime });
  const blobUrl = URL.createObjectURL(blob);

  // Higieniza o título e garante a extensão de arquivo (.jpg ou .mp4) sem duplicações
  let cleanTitle = suggestedName
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 35)
    .replace(/^_+|_+$/g, '');

  if (isProfileAvatar) {
    cleanTitle = cleanTitle.includes('1080') ? cleanTitle : `${cleanTitle || 'foto_perfil'}_1080x1080`;
  }

  const finalFilename = `limpo_${cleanTitle || (isActuallyVideo ? 'video' : 'foto')}.${finalExt}`;

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

export async function downloadCleanBatchZip(
  items: Array<{ id: string; url: string; title: string; isVideo: boolean; type?: string }>,
  zipBaseName: string,
  onProgress?: (percent: number, current: number, total: number) => void
): Promise<void> {
  const zip = new JSZip();
  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 90), i + 1, total);
    }

    try {
      if (!item.url) continue;
      const { data, mimeType } = await fetchMediaBlob(item.url);
      const isActuallyVideo = item.isVideo || mimeType.includes('video') || item.url.includes('.mp4');
      const isAvatar = item.type === 'avatar' || item.title.toLowerCase().includes('avatar');

      let cleaned: Uint8Array;
      let ext = isActuallyVideo ? 'mp4' : 'jpg';

      if (isActuallyVideo) {
        cleaned = cleanMp4Bytes(data).cleaned;
      } else if (isAvatar) {
        cleaned = await convertToCleanHd1080Image(data);
      } else {
        cleaned = cleanJpegBytes(data).cleaned;
        if (mimeType.includes('png')) ext = 'png';
      }

      const safeTitle = (item.title || `item_${item.id}`)
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .slice(0, 35)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/^_+|_+$/g, '');

      const filename = `${i + 1}_${safeTitle || 'midia'}.${ext}`;
      zip.file(filename, cleaned);
    } catch (e) {
      console.warn(`Erro ao baixar item ${item.id} para o ZIP:`, e);
    }
  }

  if (onProgress) onProgress(95, total, total);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(zipBlob);

  const safeZipName = zipBaseName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'midias';
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `pacote_limpo_${safeZipName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  if (onProgress) onProgress(100, total, total);
}
