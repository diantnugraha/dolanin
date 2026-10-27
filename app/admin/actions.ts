"use server";

import { redirect } from "next/navigation";
import { endSession, login, startSession } from "@/lib/auth";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const result = await login(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
  if (result === "locked") return { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." };
  if (result === "invalid") return { error: "Username atau password salah" };
  await startSession();
  redirect("/admin");
}

// Sengaja tanpa requireAdmin: keluar selalu boleh.
export async function logout() {
  await endSession();
  redirect("/admin/login");
}
