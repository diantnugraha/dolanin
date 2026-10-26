"use client";
import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  IconArrowLeft, IconMaximize, IconPlayerPauseFilled, IconPlayerPlayFilled, IconVolume, IconVolumeOff,
} from "@tabler/icons-react";
import { formatDuration } from "@/lib/format";
import { mediaLabel } from "@/lib/listing";
import { photoUrl, videoPoster, videoSrc } from "@/lib/media";
import { CoverImage } from "./Media";
import { useMediaViewer, type MediaItem } from "./MediaViewer";
import { ShareButton } from "./ShareButton";
import { useAutoplay } from "./useAutoplay";
import s from "./MediaHero.module.css";

/** Phone opener: a 9:16 video when the first media is a video, else a 4:5 swipe gallery. */
export function MediaHero({ media, name, backHref }: { media: MediaItem[]; name: string; backHref: string }) {
  const first = media[0];
  const bar = (extra?: ReactNode) => (
    <div className={s.tbar}>
      <Link href={backHref} className={s.cbtn} aria-label="Kembali">
        <IconArrowLeft size={20} stroke={1.75} aria-hidden="true" />
      </Link>
      <div className={s.group}>
        {extra}
        <ShareButton title={name} className={s.cbtn} />
      </div>
    </div>
  );

  if (first?.kind === "VIDEO") return <VideoHero video={first} count={media.length} bar={bar} />;
  return (
    <div className={s.hero} data-slot="hero" data-kind="PHOTO">
      {media.length ? <Gallery media={media} name={name} /> : <CoverImage cover={null} sizes="100vw" />}
      {bar()}
    </div>
  );
}

function VideoHero({
  video, count, bar,
}: {
  video: Extract<MediaItem, { kind: "VIDEO" }>; count: number; bar: (extra: ReactNode) => ReactNode;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const { open, isOpen } = useMediaViewer();
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  // The hero is sticky, so it never leaves the screen: watch where it ends instead.
  const { on, play, pause } = useAutoplay(ref, !isOpen, end);

  return (
    <>
      <div className={s.hero} data-slot="hero" data-kind="VIDEO">
        <video
          ref={ref}
          className={s.video}
          // ponytail: hidden on desktop yet still loads poster + metadata; accepted, desktop isn't quota-bound.
          src={videoSrc(video.guid)}
          poster={videoPoster(video.guid)}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onClick={() => open(0)}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime / (e.currentTarget.duration || 1))}
        />
        <div className={s.prog} data-progress aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <i key={i}>{i === 0 && <b style={{ transform: `scaleX(${progress})` }} />}</i>
          ))}
        </div>
        {bar(
          <>
            <button type="button" className={s.cbtn} aria-label={on ? "Jeda video" : "Putar video"} onClick={on ? pause : play}>
              {on ? <IconPlayerPauseFilled size={18} aria-hidden="true" /> : <IconPlayerPlayFilled size={18} aria-hidden="true" />}
            </button>
            <button
              type="button" className={s.cbtn} aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <IconVolumeOff size={20} stroke={1.75} aria-hidden="true" /> : <IconVolume size={20} stroke={1.75} aria-hidden="true" />}
            </button>
            <button type="button" className={s.cbtn} aria-label="Layar penuh" onClick={() => open(0)}>
              <IconMaximize size={20} stroke={1.75} aria-hidden="true" />
            </button>
          </>,
        )}
        <span className={s.vtag}>
          <IconPlayerPlayFilled size={14} aria-hidden="true" />
          Video{video.durationSec ? ` · ${formatDuration(video.durationSec)}` : ""}
        </span>
        {/* Big tap target on the poster; the labelled toggle in the bar is the accessible control. */}
        {!on && (
          <button type="button" className={s.play} tabIndex={-1} aria-hidden="true" onClick={play}>
            <IconPlayerPlayFilled size={28} />
          </button>
        )}
      </div>
      <div ref={end} className={s.end} aria-hidden="true" />
    </>
  );
}

function Gallery({ media, name }: { media: MediaItem[]; name: string }) {
  const { open } = useMediaViewer();
  const [index, setIndex] = useState(0);
  return (
    <>
      <div
        className={s.track}
        data-track
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {media.map((m, i) => (
          <button
            key={m.kind === "PHOTO" ? m.key : m.guid} type="button" className={s.slide}
            aria-label={mediaLabel(m, i, media.length)} onClick={() => open(i)}
          >
            {m.kind === "PHOTO" ? (
              // eslint-disable-next-line @next/next/no-img-element -- fixed WebP variants on a CDN
              <img
                src={photoUrl(m.key, 800)}
                srcSet={`${photoUrl(m.key, 800)} 800w, ${photoUrl(m.key, 1600)} 1600w`}
                // ponytail: the hero is hidden on desktop but this eager LCP image still downloads there;
                // accepted (desktop isn't quota-bound). `sizes` asks for the 800w file the mosaic reuses.
                sizes="(min-width: 1024px) 304px, 100vw"
                alt={`${name}, foto ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                decoding="async"
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Bunny serves a fixed poster */}
                <img src={videoPoster(m.guid)} alt={`${name}, video ${i + 1}`} loading="lazy" decoding="async" />
                <span className={s.badge}>
                  <IconPlayerPlayFilled size={20} aria-hidden="true" />
                </span>
              </>
            )}
          </button>
        ))}
      </div>
      {media.length > 1 && (
        <div className={s.dots} aria-hidden="true">
          {media.map((_, i) => (
            <i key={i} data-dot data-active={i === index ? "true" : undefined} />
          ))}
        </div>
      )}
    </>
  );
}
