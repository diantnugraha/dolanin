"use server";

import { requireAdmin } from "@/lib/auth";
import { createPhotoUploadFor, createVideoUploadFor } from "@/lib/media-server";

export async function createPhotoUpload() {
  await requireAdmin();
  return createPhotoUploadFor();
}

export async function createVideoUpload(title: string) {
  await requireAdmin();
  return createVideoUploadFor(String(title ?? ""));
}
