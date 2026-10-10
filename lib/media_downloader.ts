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

        // Fundo neutro
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 1080, 1080);

        // Centraliza e preenche o quadrado mantendo a proporção
        const nw = img.naturalWidth || 150;
        const nh = img.naturalHeight || 150;
        const scale = Math.max(1080 / nw, 1080 / nh);
        const w = nw * scale;
        const h = nh * scale;
        const x = (1080 - w) / 2;
        const y = (1080 - h) / 2;

        ctx.drawImage(img, x, y, w, h);

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
