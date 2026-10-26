"use client";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = matchMedia(REDUCE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export const useReducedMotion = () => useSyncExternalStore(subscribe, () => matchMedia(REDUCE).matches, () => false);

/**
 * Plays a muted video while it is on screen and pauses it when it leaves (saves data and battery).
 * Playback is driven here, not by the `autoplay` attribute, so reduced-motion users get the poster
 * and a play button, and a video hidden by CSS never starts. `watch` lets a caller observe another
 * element than the video (the sticky hero is always "on screen", so it watches a sentinel instead).
 * `on` is false when the user paused, reduced motion is on, or the browser refused to play: the
 * observer is then disconnected, so nothing resumes until `play()`. `src` re-runs the effect when the
 * source changes (720p to 480p fallback), so playback resumes on the new file.
 */
export function useAutoplay(
  video: RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  watch?: RefObject<Element | null>,
  src?: string,
) {
  const reduced = useReducedMotion();
  const [choice, setChoice] = useState<"play" | "pause" | null>(null);
  const [blocked, setBlocked] = useState(false); // e.g. iOS Low Power Mode rejects play()
  const auto = choice ? choice === "play" : !reduced && !blocked;

  useEffect(() => {
    const v = video.current;
    const target = watch?.current ?? v;
    if (!v || !target) return;
    if (!enabled || !auto) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return v.pause();
        v.play().catch((err: DOMException) => err.name === "NotAllowedError" && setBlocked(true));
      },
      { threshold: watch ? 0 : 0.5 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [video, watch, enabled, auto, src]);

  return {
    on: auto,
    play: () => {
      setChoice("play");
      video.current?.play().catch(() => {});
    },
    pause: () => {
      setChoice("pause");
      video.current?.pause();
    },
  };
}
