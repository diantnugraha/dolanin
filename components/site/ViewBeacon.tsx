"use client";
import { useEffect, useRef } from "react";

export function ViewBeacon({ id }: { id: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    navigator.sendBeacon?.("/api/view", id);
  }, [id]);
  return null;
}
