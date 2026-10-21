'use client';
import { useState, type ImgHTMLAttributes } from 'react';

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src?: string };

export function RemoteImage({ src, alt, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const fallback = !src || failedSource === src;
  return <img {...props} src={fallback ? '/image-placeholder.svg' : src}
    alt={fallback ? `${alt || 'Imagen'} · no disponible` : alt}
    referrerPolicy="no-referrer" onError={() => setFailedSource(src)} />;
}
