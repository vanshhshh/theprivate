"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/auth-provider";

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
        <div className="shell navInner">
          <Link href="/" className="brand">THE PRIVATE</Link>
          <nav className="navlinks" aria-label="Main navigation">
            <Link href="/search?from=Delhi&to=Dubai&pax=6">Explore</Link>
            <Link href="/search?emptyLeg=1">Empty Legs</Link>
            <Link href="/charter/request">Charter</Link>
            {!isLoading && isCustomer && <Link href="/trips">Trips</Link>}
          </nav>
          <div className="navActions">
            {isLoading ? (
              <span className="navStatus">Loading</span>
            ) : user ? (
              <>
                <Link className="profileChip" href={user.role === "ADMIN" ? "/admin" : user.role === "OPERATOR" ? "/operator/dashboard" : "/profile"}>
                  <Initials name={user.name} />
                  <span>{user.name}</span>
                </Link>
                <button className="linkbtn" onClick={logout}>Sign out</button>
              </>
            ) : (
              <>
                <Link href="/login">Sign in</Link>
                <Link className="navCta" href="/search?from=Delhi&to=Dubai&pax=6">Search aircraft</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

function OperatorShell({ children }: { children: React.ReactNode }) {
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
    <div className="appFrame">
      <aside className="roleSidebar">
        <Link href="/operator/dashboard" className="roleBrand"><span>THE PRIVATE</span><b>OPERATOR</b></Link>
        <nav className="roleNav" aria-label="Operator navigation">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <nav className="roleNav roleNavBottom" aria-label="Operator account">
          <Link href="/operator/notifications">Notifications</Link>
          <Link href="/operator/settings">Settings</Link>
          <Link href="/operator/profile">Profile</Link>
        </nav>
      </aside>
      <div className="roleMain">
        <header className="roleTopbar">
          <span>{user?.operatorName || user?.name || "Operator"}</span>
          <span className="pill">{user?.operatorVerified ? "Verified" : "Pending"}</span>
          <button className="linkbtn" onClick={logout}>Logout</button>
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
    ["/admin/rfqs", "RFQs"],
    ["/admin/quotes", "Quotes"],
    ["/admin/bookings", "Bookings"],
    ["/admin/users", "Users"],
    ["/admin/availability", "Availability"],
    ["/admin/aviation", "Aviation"],
    ["/admin/audit", "Audit"],
  ];
  return (
    <div className="appFrame adminFrame">
      <aside className="roleSidebar">
        <Link href="/admin" className="roleBrand"><span>THE PRIVATE</span><b>ADMIN</b></Link>
        <nav className="roleNav" aria-label="Admin navigation">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
      </aside>
      <div className="roleMain">
        <header className="roleTopbar">
          <span>{user?.name || "Admin"}</span>
          <span className="pill">Admin</span>
          <Link href="/profile">Profile</Link>
          <button className="linkbtn" onClick={logout}>Logout</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ShellBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/operator") && pathname !== "/operator" && pathname !== "/operator/login" && pathname !== "/operator/claim") {
    return <OperatorShell>{children}</OperatorShell>;
  }
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return <AdminShell>{children}</AdminShell>;
  }
  return (
    <>
      <PublicNav />
      {children}
      <footer className="footer">
        <div className="shell">
          <b>THE PRIVATE</b>
          <p>Pick an empty leg, book a full charter, or request a private flight quote.</p>
          <small>Estimated prices are confirmed before payment.</small>
        </div>
      </footer>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellBody>{children}</ShellBody>
    </AuthProvider>
  );
}
