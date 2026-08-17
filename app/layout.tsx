import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { Cormorant_Garamond, Inter, Manrope } from "next/font/google";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const mono = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "ThePrivate — Private Aviation, Simplified",
  description: "Private aviation, simplified. Search available aircraft, request charters, and manage bookings.",
  alternates: { canonical: "https://theprivate.in" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const initialUser = publicUser(user);

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AppShell initialUser={initialUser}>{children}</AppShell>
      </body>
    </html>
  );
}
