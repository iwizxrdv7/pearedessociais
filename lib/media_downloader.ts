import JSZip from 'jszip';
import { cleanMp4Bytes, cleanJpegBytes } from './pure_cleaner';

export async function fetchMediaBlob(mediaUrl: string): Promise<{ data: Uint8Array; mimeType: string }> {
  // Se for URL externa, usa o proxy local para evitar CORS
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

export async function downloadCleanSingleMedia(
  mediaUrl: string,
  suggestedName: string,
  isVideo: boolean = true
): Promise<void> {
  const { data, mimeType } = await fetchMediaBlob(mediaUrl);
  const ext = suggestedName.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');

  let cleaned: Uint8Array;
  if (['mp4', 'mov', 'm4v'].includes(ext) || isVideo) {
    const res = cleanMp4Bytes(data);
    cleaned = res.cleaned;
  } else if (['jpg', 'jpeg'].includes(ext) || !isVideo) {
    const res = cleanJpegBytes(data);
    cleaned = res.cleaned;
  } else {
    cleaned = data;
  }

  const blob = new Blob([cleaned as any], { type: mimeType || (isVideo ? 'video/mp4' : 'image/jpeg') });
  const blobUrl = URL.createObjectURL(blob);

  const safeFilename = suggestedName.endsWith(`.${ext}`) ? suggestedName : `${suggestedName}.${ext}`;
  const finalFilename = `limpo_${safeFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

export async function downloadCleanBatchZip(
  items: Array<{ id: string; url: string; title: string; isVideo: boolean }>,
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
      const ext = item.isVideo ? 'mp4' : 'jpg';

      let cleaned: Uint8Array;
      if (item.isVideo) {
        cleaned = cleanMp4Bytes(data).cleaned;
      } else {
        cleaned = cleanJpegBytes(data).cleaned;
      }

      const safeTitle = (item.title || `item_${item.id}`)
        .slice(0, 35)
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${i + 1}_${safeTitle}.${ext}`;

      zip.file(filename, cleaned);
    } catch (e) {
      console.warn(`Erro ao baixar item ${item.id} para o ZIP:`, e);
    }
  }

  if (onProgress) onProgress(95, total, total);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const blobUrl = URL.createObjectURL(zipBlob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `pacote_limpo_${zipBaseName.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

  if (onProgress) onProgress(100, total, total);
}
