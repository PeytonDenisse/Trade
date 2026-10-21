// Public reference photographs. They are illustrative, not provider identities or work evidence.
const unsplash = (photo: string, width = 1000) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&q=85`;

export const designImages = {
  plumbing: unsplash('photo-1607472586893-edb57bdc0e39'),
  electrical: unsplash('photo-1621905251918-48416bd8575a'),
  carpentry: unsplash('photo-1504148455328-c376907d081c'),
  cleaning: unsplash('photo-1581578731548-c64695cc6952'),
  home: unsplash('photo-1497366754035-f200968a6e72', 1600),
  planning: unsplash('photo-1516321318423-f06f85e504b3'),
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
    'Pintura': designImages.cleaning,
  } as Record<string, string>)[trade] || designImages.carpentry;
}

export function providerImage(provider: { photo?: unknown; trade: string }) {
  const photo = publicImageUrl(provider.photo);
  return { src: photo || tradeImage(provider.trade), illustrative: !photo };
}
