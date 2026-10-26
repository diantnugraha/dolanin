import { Sidebar } from "@/components/admin/Sidebar";
import { requireAdmin } from "@/lib/auth";
import s from "@/components/admin/admin.module.css";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className={s.shell}>
      <Sidebar />
      <main className={s.main}>{children}</main>
    </div>
  );
}
