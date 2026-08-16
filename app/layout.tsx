import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "ThePrivate - Private Aviation, Simplified",
  description: "Pick an empty leg, book a full charter, or request a private flight quote.",
  alternates: { canonical: "https://theprivate.in" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
