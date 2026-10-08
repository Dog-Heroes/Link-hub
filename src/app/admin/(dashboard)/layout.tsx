import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getAdminBrand } from "@/lib/admin-brand";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const brand = await getAdminBrand();

  return (
    <AdminShell user={session.user} brand={brand}>
      {children}
    </AdminShell>
  );
}
