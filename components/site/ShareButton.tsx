"use client";
import { useState } from "react";
import { IconShare2 } from "@tabler/icons-react";
import s from "./ShareButton.module.css";

export function ShareButton({ title }: { title: string }) {
  const [toast, setToast] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {
      // user dismissed the share sheet, or clipboard unavailable
    }
  }

  return (
    <>
      <button type="button" className={s.btn} onClick={share} aria-label="Bagikan">
        <IconShare2 size={20} stroke={1.75} aria-hidden="true" />
      </button>
      {toast && (
        <div className={s.toast} role="status">
          Tautan disalin
        </div>
      )}
    </>
  );
}
