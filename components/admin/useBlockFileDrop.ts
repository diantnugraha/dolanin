"use client";
import { useEffect } from "react";

/**
 * While a form is mounted, a file dropped outside its drop zone must not make the browser open the file
 * (that navigates away and loses every unsaved field). Drop zones still work: their own handlers run
 * first (React listens at the root) and this window listener only cancels the browser default.
 */
export function useBlockFileDrop() {
  useEffect(() => {
    const block = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      // A drop zone that accepted the dragover already called preventDefault; elsewhere show "no drop".
      if (e.type === "dragover" && !e.defaultPrevented) e.dataTransfer.dropEffect = "none";
      e.preventDefault();
    };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);
}
