"use client";
import { useEffect, useState, type RefObject, type SyntheticEvent } from "react";
import { videoSrc } from "@/lib/media";

const LADDER = [720, 480] as const;

/**
 * Never show a dead player: when Bunny's MP4 fallback has no 720p file for a video, try 480p once,
 * then report `failed` so the caller shows the poster only (no play/pause/sound controls).
 */
export function useVideoFallback(guid: string, video: RefObject<HTMLVideoElement | null>) {
  const [step, setStep] = useState(0);
  const failed = step >= LADDER.length;
  // The hero preloads metadata from the server HTML: a 404 before hydration fired no React event.
  // Load it again so the error repeats with onError attached.
  useEffect(() => {
    if (video.current?.error) video.current.load();
  }, [video]);
  return {
    src: failed ? undefined : videoSrc(guid, LADDER[step]),
    failed,
    onError: (e: SyntheticEvent<HTMLVideoElement>) => {
      const bad = e.currentTarget.getAttribute("src");
      // Advance only past the source that actually failed, so a duplicate error can't skip 480p.
      setStep((s) => (s < LADDER.length && bad === videoSrc(guid, LADDER[s]) ? s + 1 : s));
    },
  };
}
