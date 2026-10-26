"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  IconChevronLeft, IconChevronRight, IconCloudUpload, IconGripVertical, IconMovie, IconPlayerPlayFilled, IconX,
} from "@tabler/icons-react";
import { photoUrl, videoPoster } from "@/lib/media";
import { uploadPhoto, uploadVideo } from "./upload";
import s from "./form.module.css";

export type MediaItem = {
  id: string;
  kind: "PHOTO" | "VIDEO";
  key: string; // empty while uploading
  status: "PROCESSING" | "READY" | "FAILED" | null;
  preview?: string;
  uploading?: boolean;
  progress?: number;
};

export function MediaManager({
  items, setItems, error,
}: {
  items: MediaItem[];
  setItems: Dispatch<SetStateAction<MediaItem[]>>;
  error?: string;
}) {
  const [msg, setMsg] = useState("");
  const [over, setOver] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  const patch = (id: string, p: Partial<MediaItem>) =>
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...p } : i)));

  function move(from: number, to: number) {
    if (from === to || to < 0) return;
    setItems((cur) => {
      if (to >= cur.length) return cur;
      const next = [...cur];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  async function upload(f: File) {
    const isVideo = f.type.startsWith("video/");
    if (!isVideo && !f.type.startsWith("image/")) {
      setMsg(`${f.name}: bukan foto atau video.`);
      return;
    }
    const id = crypto.randomUUID();
    setItems((cur) => [
      ...cur,
      {
        id, kind: isVideo ? "VIDEO" : "PHOTO", key: "", status: isVideo ? "PROCESSING" : null,
        preview: isVideo ? undefined : URL.createObjectURL(f), uploading: true, progress: 0,
      },
    ]);
    try {
      const key = isVideo
        ? (await uploadVideo(f, (progress) => patch(id, { progress }))).guid
        : (await uploadPhoto(f)).key;
      patch(id, { key, uploading: false });
    } catch (e) {
      setItems((cur) => cur.filter((i) => i.id !== id));
      setMsg(e instanceof Error ? e.message : "Gagal mengunggah.");
    }
  }

  function addFiles(files: FileList | null) {
    setMsg("");
    for (const f of Array.from(files ?? [])) void upload(f);
  }

  return (
    <div>
      <ol className={s.media}>
        {items.map((m, i) => {
          const src = m.preview ?? (m.kind === "PHOTO" ? photoUrl(m.key, 800) : m.status === "READY" ? videoPoster(m.key) : null);
          return (
            <li
              key={m.id}
              className={`${s.m} ${over === i ? s.over : ""}`}
              draggable
              onDragStart={(e) => {
                dragFrom.current = i;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                if (dragFrom.current === null) return;
                e.preventDefault();
                setOver(i);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                if (dragFrom.current === null) return;
                e.preventDefault();
                move(dragFrom.current, i);
                dragFrom.current = null;
                setOver(null);
              }}
              onDragEnd={() => {
                dragFrom.current = null;
                setOver(null);
              }}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob or CDN thumbnail
                <img src={src} alt={`${m.kind === "VIDEO" ? "Video" : "Foto"} ${i + 1}`} draggable={false} />
              ) : (
                <span className={s.wait}>
                  <IconMovie size={24} aria-hidden="true" />
                  {m.uploading ? "Mengunggah" : "Sedang diproses"}
                </span>
              )}
              {i === 0 && <span className={`${s.tag} ${s.cover}`}>Pembuka</span>}
              {m.kind === "VIDEO" && (
                <span className={s.vtag}>
                  <IconPlayerPlayFilled size={12} aria-hidden="true" />
                  Video
                </span>
              )}
              {m.uploading && (
                <progress className={s.prog} value={m.progress ?? 0} max={100} aria-label={`Unggah media ${i + 1}`} />
              )}
              <span className={s.grip} aria-hidden="true">
                <IconGripVertical size={14} />
              </span>
              <span className={s.ctl}>
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Geser media ${i + 1} ke depan`}>
                  <IconChevronLeft size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label={`Geser media ${i + 1} ke belakang`}>
                  <IconChevronRight size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => setItems((cur) => cur.filter((x) => x.id !== m.id))} aria-label={`Hapus media ${i + 1}`}>
                  <IconX size={14} aria-hidden="true" />
                </button>
              </span>
            </li>
          );
        })}
        <li className={s.addCell}>
          <label
            className={s.add}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (dragFrom.current !== null) return;
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
          >
            <IconCloudUpload size={24} aria-hidden="true" />
            <span>Tarik foto atau video ke sini atau klik untuk pilih</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              aria-label="Pilih foto atau video"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </li>
      </ol>
      {msg && <p className={s.err} role="alert">{msg}</p>}
      {error && <p className={s.err} role="alert">{error}</p>}
    </div>
  );
}
