"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { deleteListing, saveListing, type SaveResult } from "@/lib/admin";

export async function saveListingAction(input: unknown, id?: string): Promise<Extract<SaveResult, { ok: false }>> {
  await requireAdmin();
  const r = await saveListing(input, id);
  if (!r.ok) return r;
  redirect("/admin/listing?tersimpan=1");
}

export async function deleteListingAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteListing(id);
  revalidatePath("/admin/listing");
}
