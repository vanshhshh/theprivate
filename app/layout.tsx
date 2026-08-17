import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const metadata = {
  title: "ThePrivate - Private Aviation, Simplified",
  description: "Pick an empty leg, book a full charter, or request a private flight quote.",
  alternates: { canonical: "https://theprivate.in" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initialUser = publicUser(user);

  return (
    <html lang="en">
      <body>
        <AppShell initialUser={initialUser}>{children}</AppShell>
      </body>
    </html>
  );
}
