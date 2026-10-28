"use client";

import { useState, useActionState } from "react";
import { unstable_rethrow } from "next/navigation";
import { changePasswordAction, saveSettingsAction } from "./actions";
import a from "./admin.module.css";
import s from "./form.module.css";

type State = { error?: string; ok?: string };

function WaForm({ initial }: { initial: string }) {
  const [wa, setWa] = useState(initial);
  const [state, submit, pending] = useActionState<State, FormData>(async () => {
    try {
      const r = await saveSettingsAction({ waDefault: wa });
      return r.ok ? { ok: "Nomor tersimpan" } : { error: r.errors.waDefault ?? r.errors.form };
    } catch (e) {
      unstable_rethrow(e);
      return { error: "Gagal menyimpan. Periksa koneksi lalu coba lagi." };
    }
  }, {});
  return (
    <form action={submit} noValidate>
      <section className={s.card}>
        <h2>WhatsApp</h2>
        <p className={s.hint}>Nomor ini dipakai tombol &quot;Tanya via WA&quot; di header dan blok WhatsApp di landing. Kosongkan untuk menyembunyikannya.</p>
        <div className={s.f}>
          <label htmlFor="waDefault">Nomor WhatsApp default</label>
          <input id="waDefault" inputMode="tel" placeholder="0812-0000-0000" value={wa} onChange={(e) => setWa(e.target.value)}
            aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "waDefault-msg" : undefined} />
          {state.error && <p className={s.err} id="waDefault-msg" role="alert">{state.error}</p>}
          {state.ok && <p className={s.ok} role="status">{state.ok}</p>}
        </div>
        <div className={s.actions}>
          <button type="submit" className={`${a.btn} ${a.pri}`} disabled={pending}>Simpan nomor</button>
        </div>
      </section>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [state, submit, pending] = useActionState<State, FormData>(async () => {
    try {
      const r = await changePasswordAction(current, next);
      if (r === "ok") {
        setCurrent("");
        setNext("");
        return { ok: "Password berhasil diganti" };
      }
      return { error: r === "wrong" ? "Password lama salah" : "Password baru minimal 10 karakter" };
    } catch (e) {
      unstable_rethrow(e);
      return { error: "Gagal mengganti password. Periksa koneksi lalu coba lagi." };
    }
  }, {});
  return (
    <form action={submit} noValidate>
      <section className={s.card}>
        <h2>Ganti password</h2>
        <p className={s.hint}>Minimal 10 karakter.</p>
        <div className={s.f}>
          <label htmlFor="current">Password lama</label>
          <input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className={s.f}>
          <label htmlFor="next">Password baru</label>
          <input id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)}
            aria-invalid={state.error ? true : undefined} aria-describedby={state.error ? "pw-msg" : undefined} />
          {state.error && <p className={s.err} id="pw-msg" role="alert">{state.error}</p>}
          {state.ok && <p className={s.ok} role="status">{state.ok}</p>}
        </div>
        <div className={s.actions}>
          <button type="submit" className={`${a.btn} ${a.pri}`} disabled={pending}>Ganti password</button>
        </div>
      </section>
    </form>
  );
}

export function SettingsForm({ waDefault }: { waDefault: string }) {
  return (
    <div className={s.narrow}>
      <WaForm initial={waDefault} />
      <PasswordForm />
    </div>
  );
}
