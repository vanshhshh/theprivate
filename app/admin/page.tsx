import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminRoot() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/");
  redirect("/admin/overview");
}
