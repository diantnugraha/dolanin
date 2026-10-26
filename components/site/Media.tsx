import { IconMapPin } from "@tabler/icons-react";
import type { Cover } from "@/lib/catalog";
import { photoUrl, videoPoster } from "@/lib/media";
import s from "./Media.module.css";

/** Fills its (positioned, sized) parent. Photo, video poster, or placeholder. */
export function CoverImage({ cover, sizes, alt = "" }: { cover: Cover | null; sizes: string; alt?: string }) {
  if (!cover) {
    return (
      <div className={s.placeholder} aria-hidden="true">
        <IconMapPin size={32} stroke={1.5} />
      </div>
    );
  }
  if (cover.kind === "VIDEO") {
    // eslint-disable-next-line @next/next/no-img-element -- Bunny serves a fixed poster, no resizing needed
    return <img className={s.img} src={videoPoster(cover.guid)} alt={alt} sizes={sizes} loading="lazy" decoding="async" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- media is already resized to fixed WebP variants on a CDN
    <img
      className={s.img}
      src={photoUrl(cover.key, 800)}
      srcSet={`${photoUrl(cover.key, 800)} 800w, ${photoUrl(cover.key, 1600)} 1600w`}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
