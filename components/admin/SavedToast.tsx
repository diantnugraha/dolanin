"use client";

import { useEffect, useState } from "react";
import s from "./admin.module.css";

export function SavedToast({ show, message = "Listing tersimpan" }: { show: boolean; message?: string }) {
  const [on, setOn] = useState(show);
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setOn(false), 3000);
    return () => clearTimeout(t);
  }, [show]);
  return (
    <div className={on ? s.toast : "sr-only"} role="status" aria-live="polite">
      {on ? message : ""}
    </div>
  );
}
