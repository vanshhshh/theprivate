"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth, type AuthUser } from "@/components/auth-provider";

function Initials({ name }: { name?: string | null }) {
  const text = (name || "User").trim();
  return <span className="avatar">{text.slice(0, 1).toUpperCase()}</span>;
}

function PublicNav() {
  const { user, isLoading, logout } = useAuth();
  const isCustomer = user?.role === "CUSTOMER";
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">The Private</Link>
          <nav className="nav-links" aria-label="Main navigation">
            <Link href="/search?from=Delhi&to=Dubai&pax=6">Explore</Link>
            <Link href="/search?emptyLeg=1">Empty legs</Link>
            <Link href="/charter/request">Charter</Link>
            {!isLoading && isCustomer && <Link href="/trips">Trips</Link>}
          </nav>
          <div className="nav-actions">
            {isLoading ? (
              <span className="muted" style={{ fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>Loading</span>
            ) : user ? (
              <>
                <Link className="profile-chip" href={user.role === "ADMIN" ? "/admin" : user.role === "OPERATOR" ? "/operator/dashboard" : "/profile"}>
                  <Initials name={user.name} />
                  <span>{user.name}</span>
                </Link>
                <button className="link-btn" onClick={logout}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login" style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)", textTransform: "uppercase" }}>Sign in</Link>
                <Link className="nav-cta" href="/search?from=Delhi&to=Dubai&pax=6">Search aircraft</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

function OperatorShell({ children, initialUser }: { children: React.ReactNode; initialUser?: AuthUser | null }) {
  const { user, logout } = useAuth();
  const links = [
    ["/operator/dashboard", "Dashboard"],
    ["/operator/fleet", "Fleet"],
    ["/operator/availability", "Availability"],
    ["/operator/rfqs", "Requests"],
    ["/operator/quotes", "Quotes"],
    ["/operator/bookings", "Bookings"],
  ];
  return (
    <div className="op-shell">
      <aside className="op-sidebar">
        <div className="op-brand">
          <span>The Private</span>
          <b>Operator</b>
        </div>
        <nav className="op-nav" aria-label="Operator navigation">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <nav className="op-nav op-nav-bottom" aria-label="Operator account">
          <Link href="/operator/notifications">Notifications</Link>
          <Link href="/operator/settings">Settings</Link>
          <Link href="/operator/profile">Profile</Link>
        </nav>
      </aside>
      <div className="op-main">
        <header className="op-topbar">
          <span style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)" }}>{user?.operatorName || user?.name || "Operator"}</span>
          <span className="badge badge-dark">{user?.operatorVerified ? "Verified" : "Pending"}</span>
          <button className="link-btn" onClick={logout}>Logout</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const links = [
    ["/admin", "Overview"],
    ["/admin/operators", "Operators"],
    ["/admin/aircraft", "Aircraft"],
    ["/admin/claims", "Claims"],
    ["/admin/rfqs", "Requests"],
    ["/admin/quotes", "Quotes"],
    ["/admin/bookings", "Bookings"],
    ["/admin/users", "Users"],
    ["/admin/availability", "Availability"],
    ["/admin/aviation", "Aviation"],
    ["/admin/audit", "Audit"],
  ];
  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <div className="ad-brand">
          <span>The Private</span>
          <b>Admin</b>
        </div>
        <nav className="ad-nav" aria-label="Admin navigation">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </aside>
      <div className="ad-main">
        <header className="ad-topbar">
          <span style={{ fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-wide)" }}>{user?.name || "Admin"}</span>
          <span className="badge badge-dark">Admin</span>
          <button className="link-btn" onClick={logout}>Logout</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ShellBody({ children, initialUser }: { children: React.ReactNode; initialUser?: AuthUser | null }) {
  const pathname = usePathname();
  if (pathname.startsWith("/operator") && pathname !== "/operator" && pathname !== "/operator/login" && pathname !== "/operator/claim") {
    return <OperatorShell initialUser={initialUser}>{children}</OperatorShell>;
  }
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return <AdminShell>{children}</AdminShell>;
  }
  return (
    <>
      <PublicNav />
      <main style={{ minHeight: "calc(100svh - 72px)" }}>{children}</main>
      <footer className="site-footer">
        <div className="shell">
          <b>The Private</b>
          <p>Private aviation, simplified. Search available aircraft, request charters, and manage bookings.</p>
          <small style={{ color: "var(--muted)", fontSize: "var(--text-xs)" }}>Estimated prices are confirmed before payment.</small>
        </div>
      </footer>
    </>
  );
}

export function AppShell({ children, initialUser }: { children: React.ReactNode; initialUser?: AuthUser | null }) {
  return (
    <AuthProvider initialUser={initialUser}>
      <ShellBody initialUser={initialUser}>{children}</ShellBody>
    </AuthProvider>
  );
}
