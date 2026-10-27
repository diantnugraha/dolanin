import { SettingsForm } from "@/components/admin/SettingsForm";
import { getSettings } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import a from "@/components/admin/admin.module.css";

export default async function SettingsPage() {
  await requireAdmin();
  const { waDefault } = await getSettings();
  return (
    <>
      <div className={a.top}>
        <h1>Pengaturan</h1>
      </div>
      <SettingsForm waDefault={waDefault} />
    </>
  );
}
