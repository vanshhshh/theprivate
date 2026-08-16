import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";

const publicOperatorRoutes = new Set(["/operator", "/operator/login", "/operator/claim"]);

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") || "";
  if (publicOperatorRoutes.has(pathname)) return children;
  const user = await getCurrentUser();
  if (!user) redirect("/operator/login");
  if (user.role !== "OPERATOR" || !user.operatorId) redirect(user.role === "ADMIN" ? "/admin" : "/");
  return children;
}
