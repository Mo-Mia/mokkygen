export interface MediaActionResult {
  ok: boolean;
  message: string;
}

function extensionFromMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'png';
}

function filenameBase(modelName: string): string {
  return modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mokkygen';
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function imageUrlToBlob(imageUrl: string): Promise<Blob> {
  if (imageUrl.startsWith('data:image/')) return dataUrlToBlob(imageUrl);

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Image host returned ${response.status}`);
  return response.blob();
}

export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function copyText(text: string): Promise<MediaActionResult> {
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, message: 'Copied.' };
  } catch {
    return { ok: false, message: 'Clipboard access was blocked by the browser.' };
  }
}

export async function downloadImage(imageUrl: string, modelName: string): Promise<MediaActionResult> {
  try {
    const blob = await imageUrlToBlob(imageUrl);
    const extension = extensionFromMime(blob.type);
    saveBlob(blob, `${filenameBase(modelName)}-${Date.now()}.${extension}`);
    return { ok: true, message: 'Download started.' };
  } catch {
    window.open(imageUrl, '_blank', 'noopener,noreferrer');
    const copied = await copyText(imageUrl);
    return {
      ok: false,
      message: copied.ok
        ? 'Direct download was blocked by the image host. Opened the image and copied its URL.'
        : 'Direct download was blocked by the image host. Opened the image in a new tab.',
    };
  }
}

export async function shareImage(imageUrl: string, prompt: string, modelName: string): Promise<MediaActionResult> {
  const shareData = {
    title: `MokkyGen image from ${modelName}`,
    text: prompt,
    url: imageUrl.startsWith('data:image/') ? undefined : imageUrl,
  };

  try {
    if (navigator.share) {
      if (navigator.canShare) {
        try {
          const blob = await imageUrlToBlob(imageUrl);
          const extension = extensionFromMime(blob.type);
          const file = new File([blob], `${filenameBase(modelName)}.${extension}`, { type: blob.type || 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ ...shareData, files: [file] });
            return { ok: true, message: 'Shared.' };
          }
        } catch {
          // Fall through to URL/text sharing.
        }
      }

      await navigator.share(shareData);
      return { ok: true, message: 'Shared.' };
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, message: 'Share cancelled.' };
    }
  }

  const fallbackText = [prompt, imageUrl].filter(Boolean).join('\n\n');
  const copied = await copyText(fallbackText);
  return copied.ok
    ? { ok: true, message: 'Sharing is not available here. Copied the prompt and image URL.' }
    : { ok: false, message: 'Sharing and clipboard access are not available in this browser.' };
}
