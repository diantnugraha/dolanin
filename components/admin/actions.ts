"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { changePassword, requireAdmin } from "@/lib/auth";
import {
  cityListingCount, deleteCity, deleteListing, saveCity, saveListing, saveSettings, type SaveResult,
} from "@/lib/admin";

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

export async function saveCityAction(input: unknown, id?: string): Promise<Extract<SaveResult, { ok: false }>> {
  await requireAdmin();
  const r = await saveCity(input, id);
  if (!r.ok) return r;
  revalidatePath("/", "layout");
  redirect("/admin/kota?tersimpan=1");
}

export async function deleteCityAction(id: string): Promise<{ error: string | null }> {
  await requireAdmin();
  if ((await deleteCity(id)) === "has-listings") {
    const n = await cityListingCount(id);
    return { error: `Kota ini masih punya ${n} listing. Pindahkan atau hapus listingnya dulu.` };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

export async function saveSettingsAction(input: { waDefault: string }): Promise<SaveResult> {
  await requireAdmin();
  const r = await saveSettings(input);
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

export async function changePasswordAction(current: string, next: string): Promise<"ok" | "wrong" | "weak"> {
  await requireAdmin();
  return changePassword(String(current ?? ""), String(next ?? ""));
}
