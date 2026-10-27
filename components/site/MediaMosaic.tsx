"use client";
import { useRef, useState } from "react";
import {
  IconLayoutGrid, IconPlayerPauseFilled, IconPlayerPlayFilled, IconVolume, IconVolumeOff,
} from "@tabler/icons-react";
import { formatDuration } from "@/lib/format";
import { mediaLabel } from "@/lib/listing";
import { videoPoster } from "@/lib/media";
import { CoverImage } from "./Media";
import { useMediaViewer, type MediaItem } from "./MediaViewer";
import { useAutoplay } from "./useAutoplay";
import { useVideoFallback } from "./useVideoFallback";
import s from "./MediaMosaic.module.css";

/**
 * Desktop media grid (304px 1fr 1fr × 2 rows). A video is the tall left tile; a photo-first
 * listing gets a wide lead photo and shows 3 tiles. Layout per count lives in the CSS.
 */
export function MediaMosaic({ media, name }: { media: MediaItem[]; name: string }) {
  const { open } = useMediaViewer();
  const first = media[0];
  if (!first) {
    return (
      <div className={s.mosaic} data-mosaic data-count="1">
        <div className={s.tile}>
          <CoverImage cover={null} sizes="700px" />
        </div>
      </div>
    );
  }
  const shown = media.slice(0, first.kind === "VIDEO" ? 5 : 3);
  return (
    <div className={s.mosaic} data-mosaic data-count={shown.length} data-first={first.kind}>
      {shown.map((m, i) =>
        m.kind === "VIDEO" ? (
          <VideoTile key={m.guid} video={m} label={mediaLabel(m, i, media.length)} onOpen={() => open(i)} />
        ) : (
          <div key={m.key} className={s.tile}>
            <button type="button" className={s.open} aria-label={mediaLabel(m, i, media.length)} onClick={() => open(i)}>
              <CoverImage cover={m} sizes={i === 0 ? "500px" : "400px"} alt={`${name}, foto ${i + 1}`} />
            </button>
          </div>
        ),
      )}
      <button type="button" className={s.all} onClick={() => open(0)}>
        <IconLayoutGrid size={16} stroke={1.75} aria-hidden="true" />
        Lihat semua ({media.length})
      </button>
    </div>
  );
}

function VideoTile({
  video, label, onOpen,
}: { video: Extract<MediaItem, { kind: "VIDEO" }>; label: string; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { isOpen } = useMediaViewer();
  const [muted, setMuted] = useState(true);
  const { src, failed, onError } = useVideoFallback(video.guid, ref);
  const { on, play, pause } = useAutoplay(ref, !isOpen && !failed, undefined, src);
  return (
    <div className={s.tile}>
      <button type="button" className={s.open} aria-label={label} onClick={onOpen}>
        {/* Poster as a lazy <img> under the video, not a `poster` attribute: browsers fetch a poster
            even under display:none, and this mosaic is hidden on phones (hemat kuota). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- Bunny serves a fixed poster */}
        <img className={s.poster} src={videoPoster(video.guid)} alt="" loading="lazy" decoding="async" />
        {/* No playable file: the poster above stays, without a player. */}
        {!failed && <video ref={ref} src={src} muted={muted} loop playsInline preload="none" onError={onError} />}
      </button>
      <span className={s.pill}>
        <IconPlayerPlayFilled size={14} aria-hidden="true" />
        Video{video.durationSec ? ` · ${formatDuration(video.durationSec)}` : ""}
      </span>
      {!failed && (
        <div className={s.ctrl}>
          <button type="button" className={s.cbtn} aria-label={on ? "Jeda video" : "Putar video"} onClick={on ? pause : play}>
            {on ? <IconPlayerPauseFilled size={18} aria-hidden="true" /> : <IconPlayerPlayFilled size={18} aria-hidden="true" />}
          </button>
          <button
            type="button" className={s.cbtn} aria-label={muted ? "Nyalakan suara" : "Matikan suara"}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <IconVolumeOff size={20} stroke={1.75} aria-hidden="true" /> : <IconVolume size={20} stroke={1.75} aria-hidden="true" />}
          </button>
        </div>
      )}
      {/* Big tap target on the poster; the labelled toggle above is the accessible control. */}
      {!on && !failed && (
        <button type="button" className={`${s.cbtn} ${s.play}`} tabIndex={-1} aria-hidden="true" onClick={play}>
          <IconPlayerPlayFilled size={24} />
        </button>
      )}
    </div>
  );
}
