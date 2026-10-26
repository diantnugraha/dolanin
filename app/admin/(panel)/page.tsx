import { requireAdmin } from "@/lib/auth";

export default async function DashboardPage() {
  await requireAdmin();
  return <h1>Dashboard</h1>;
}
