"use client";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { IconShare2 } from "@tabler/icons-react";
import s from "./ShareButton.module.css";

const subscribeNever = () => () => {};

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [toast, setToast] = useState(false);
  // The toast lives in <body>: inside the sticky media hero it would sit under the info sheet.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

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
      <button type="button" className={className ?? s.btn} onClick={share} aria-label="Bagikan">
        <IconShare2 size={20} stroke={1.75} aria-hidden="true" />
      </button>
      {mounted &&
        createPortal(
          <div className={toast ? s.toast : "sr-only"} role="status" aria-live="polite">
            {toast ? "Tautan disalin" : ""}
          </div>,
          document.body,
        )}
    </>
  );
}
