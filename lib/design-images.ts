// Project-owned illustrative assets. Provider photos and work evidence come only from uploaded files.
export const designImages = {
  plumbing: '/design-assets/plomeria.png',
  electrical: '/design-assets/electricidad.png',
  carpentry: '/design-assets/carpinteria.png',
  home: '/design-assets/hogar.png',
  planning: '/design-assets/planificacion.png',
};

export function publicImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* File identifiers are not public image URLs. */ }
}

export function tradeImage(trade: string) {
  return ({
    'Plomería': designImages.plumbing,
    'Electricidad': designImages.electrical,
    'Carpintería': designImages.carpentry,
  } as Record<string, string>)[trade] || '/image-placeholder.svg';
}

export function providerImage(provider: { photo?: unknown; trade: string }) {
  const photo = publicImageUrl(provider.photo);
  const fileId = typeof provider.photo === 'string' && /^[\w-]{1,100}$/.test(provider.photo)
    ? provider.photo : undefined;
  return { src: photo || (fileId ? '/api/files/' + encodeURIComponent(fileId) : '/image-placeholder.svg'), illustrative: !photo && !fileId };
}
