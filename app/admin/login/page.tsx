import { LoginForm } from "./LoginForm";
import s from "@/components/admin/admin.module.css";

export default function LoginPage() {
  return (
    <main className={s.loginWrap}>
      <div className={s.card}>
        <div className={s.brand}>
          <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 3C14.6 3 7 10.6 7 20c0 12 17 25 17 25s17-13 17-25C41 10.6 33.4 3 24 3Z" fill="#F26B3A" />
            <circle cx="24" cy="20" r="7" fill="#FFC24B" />
            <path d="M14 33q10-6 20 0" stroke="#0E8C8C" strokeWidth="3" fill="none" strokeLinecap="round" />
          </svg>
          <span>dolanin</span>
        </div>
        <h1>Masuk admin</h1>
        <p>Khusus pengelola Dolanin.</p>
        <LoginForm />
      </div>
    </main>
  );
}
