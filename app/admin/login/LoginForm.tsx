"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import s from "@/components/admin/admin.module.css";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <form action={action}>
      {state.error && (
        <p className={s.error} role="alert">
          {state.error}
        </p>
      )}
      <div className={s.field}>
        <label htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required />
      </div>
      <div className={s.field}>
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Masuk..." : "Masuk"}
      </button>
    </form>
  );
}
