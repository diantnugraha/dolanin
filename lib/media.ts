// Isomorphic: safe for client components. Reads NEXT_PUBLIC_* env at call time.
export function photoUrl(key: string, w: 800 | 1600): string {
  return `${process.env.NEXT_PUBLIC_MEDIA_CDN_URL}/${key}-${w}.webp`;
}

/** Bunny MP4 fallback file; players try 720p, then 480p (components/site/useVideoFallback.ts). */
export function videoSrc(guid: string, height: 720 | 480 = 720): string {
  return `https://${process.env.NEXT_PUBLIC_BUNNY_CDN_HOST}/${guid}/play_${height}p.mp4`;
}

export function videoPoster(guid: string): string {
  return `https://${process.env.NEXT_PUBLIC_BUNNY_CDN_HOST}/${guid}/thumbnail.jpg`;
}
