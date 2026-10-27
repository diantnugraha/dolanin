"use client";
import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import {
  IconChevronLeft, IconChevronRight, IconPlayerPlayFilled, IconVolume, IconVolumeOff, IconX,
} from "@tabler/icons-react";
import type { ListingDetail } from "@/lib/catalog";
import { photoUrl, videoPoster } from "@/lib/media";
import { useAutoplay, useReducedMotion } from "./useAutoplay";
import { useVideoFallback } from "./useVideoFallback";
import s from "./MediaViewer.module.css";

export type MediaItem = ListingDetail["media"][number];

const Ctx = createContext<{ open: (index: number) => void; isOpen: boolean }>({ open: () => {}, isOpen: false });

/** `open(index)` shows the fullscreen viewer; `isOpen` lets inline videos pause behind it. */
export const useMediaViewer = () => useContext(Ctx);

/** Owns the viewer state for the page. Server components open it through `MediaOpen`. */
export function MediaViewerProvider({
  media, name, dockSlot, children,
}: { media: MediaItem[]; name: string; dockSlot: ReactNode; children: ReactNode }) {
  const [start, setStart] = useState<number | null>(null);
  const value = useMemo(() => ({ open: setStart, isOpen: start !== null }), [start]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {/* key: every open starts fresh (index, muted, progress) */}
      <MediaViewer
        key={start ?? "closed"}
        media={media} name={name} startIndex={start ?? 0} open={start !== null}
        onClose={() => setStart(null)} dockSlot={dockSlot}
      />
    </Ctx.Provider>
  );
}

export function MediaOpen({
  index, className, label, children,
}: { index: number; className?: string; label?: string; children: ReactNode }) {
  const { open } = useMediaViewer();
  return (
    <button type="button" className={className} aria-label={label} onClick={() => open(index)}>
      {children}
    </button>
  );
}

export function MediaViewer({
  media, name, startIndex, open, onClose, dockSlot,
}: {
  media: MediaItem[]; name: string; startIndex: number; open: boolean; onClose: () => void; dockSlot: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [dead, setDead] = useState<ReadonlySet<string>>(new Set()); // videos with no playable file
  const markDead = useCallback((guid: string) => setDead((d) => new Set(d).add(guid)), []);
  const reduced = useReducedMotion();
  const n = media.length;

  // Closing goes through the native dialog (Esc, ✕) and its close event; the provider then remounts us.
  useLayoutEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    track.current?.scrollTo({ left: startIndex * track.current.clientWidth, behavior: "instant" });
  }, [open, startIndex]);

  /** Scrolls to item i; false when i is past either end (nothing to do). */
  const go = (i: number) => {
    const t = track.current;
    if (!t || i < 0 || i >= n) return false;
    t.scrollTo({ left: i * t.clientWidth, behavior: reduced ? "instant" : "smooth" });
    return true;
  };
  const onScroll = () => {
    const t = track.current;
    if (!t) return;
    const i = Math.round(t.scrollLeft / t.clientWidth);
    if (i !== current) {
      setCurrent(i);
      setProgress(0);
    }
  };

  const next = media[current + 1];
  const item = media[current];

  return (
    <dialog
      ref={dialog}
      className={s.viewer}
      aria-label={`Foto & video ${name}`}
      onClose={onClose}
      onKeyDown={(e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        // Only swallow the key when we move; the focused track would also scroll natively.
        if (step && go(current + step)) e.preventDefault();
      }}
    >
      {open && (
        <>
          <div className={s.stage}>
            <div className={s.frame}>
              <div className={s.track} ref={track} onScroll={onScroll} data-track>
                {media.map((m, i) => (
                  <div className={s.slide} key={m.kind === "PHOTO" ? m.key : m.guid}>
                    {m.kind === "PHOTO" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- fixed WebP variants on a CDN
                      <img
                        className={s.photo}
                        src={photoUrl(m.key, 1600)}
                        srcSet={`${photoUrl(m.key, 800)} 800w, ${photoUrl(m.key, 1600)} 1600w`}
                        sizes="(min-width: 1024px) 480px, 100vw"
                        alt={`${name}, foto ${i + 1}`}
                        loading={Math.abs(i - startIndex) <= 1 ? "eager" : "lazy"}
                        decoding="async"
                      />
                    ) : (
                      <ViewerVideo
                        guid={m.guid}
                        label={`${name}, video ${i + 1}`}
                        active={i === current}
                        muted={muted}
                        onProgress={setProgress}
                        onFailed={markDead}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className={s.prog} aria-hidden="true">
                {media.map((m, i) => (
                  <i key={i}>
                    <b style={{ transform: `scaleX(${i < current || (i === current && m.kind === "PHOTO") ? 1 : i === current ? progress : 0})` }} />
                  </i>
                ))}
              </div>
              <div className={s.tbar}>
                <button type="button" className={s.cbtn} aria-label="Tutup" onClick={() => dialog.current?.close()}>
                  <IconX size={20} stroke={1.75} aria-hidden="true" />
                </button>
                {item?.kind === "VIDEO" && !dead.has(item.guid) && (
                  <button
                    type="button" className={s.cbtn} aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
                    onClick={() => setMuted(!muted)}
                  >
                    {muted ? <IconVolumeOff size={20} stroke={1.75} aria-hidden="true" /> : <IconVolume size={20} stroke={1.75} aria-hidden="true" />}
                  </button>
                )}
              </div>
              {current > 0 && (
                <button type="button" className={`${s.cbtn} ${s.prev}`} aria-label="Sebelumnya" onClick={() => go(current - 1)}>
                  <IconChevronLeft size={22} stroke={1.75} aria-hidden="true" />
                </button>
              )}
              {next && (
                <button type="button" className={`${s.cbtn} ${s.next}`} aria-label="Berikutnya" onClick={() => go(current + 1)}>
                  <IconChevronRight size={22} stroke={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className={s.cap}>
            <b>{name}</b>
            <span>
              {next && `Geser ke kiri untuk ${next.kind === "VIDEO" ? "video" : "foto"} berikutnya · `}
              {current + 1} dari {n}
            </span>
          </div>
          <div className={s.dock}>{dockSlot}</div>
        </>
      )}
    </dialog>
  );
}

function ViewerVideo({
  guid, label, active, muted, onProgress, onFailed,
}: {
  guid: string; label: string; active: boolean; muted: boolean; onProgress: (p: number) => void; onFailed: (guid: string) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const { src, failed, onError } = useVideoFallback(guid, ref);
  const { on, play, pause } = useAutoplay(ref, active && !failed, undefined, src);
  useEffect(() => {
    if (failed) onFailed(guid); // hides the viewer's sound button for this slide
  }, [failed, guid, onFailed]);
  // No playable file: poster only, never a dead player.
  // eslint-disable-next-line @next/next/no-img-element -- Bunny serves a fixed poster
  if (failed) return <img className={s.video} src={videoPoster(guid)} alt={label} />;
  return (
    <>
      <video
        ref={ref}
        className={s.video}
        src={src}
        poster={videoPoster(guid)}
        aria-label={label}
        muted={muted}
        loop
        playsInline
        preload="none"
        onClick={() => (ref.current?.paused ? play() : pause())}
        onError={onError}
        onTimeUpdate={active ? (e) => onProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1)) : undefined}
      />
      {/* Off-screen slides get no button: it would be an invisible tab stop. */}
      {active && !on && (
        <button type="button" className={s.play} aria-label="Putar video" onClick={play}>
          <IconPlayerPlayFilled size={28} aria-hidden="true" />
        </button>
      )}
    </>
  );
}
