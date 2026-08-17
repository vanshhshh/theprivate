import Link from "next/link";
import { db } from "@/lib/prisma";
import { BookingStatus, QuoteStatus, RfqStatus } from "@/app/generated/prisma/enums";

type AdminDataset = "aircraft" | "claims" | "rfqs" | "quotes" | "bookings" | "users" | "availability" | "aviation" | "audit";

function statusText(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value ? String(value).replaceAll("_", " ") : "Not set";
}

export async function AdminConsolePage({ dataset }: { dataset: AdminDataset }) {
  const title = dataset === "rfqs" ? "RFQs" : dataset.slice(0, 1).toUpperCase() + dataset.slice(1);

  if (dataset === "aircraft") {
    const rows = await db.aircraft.findMany({ include: { operator: true }, orderBy: { updatedAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [item.registration, item.model || item.type || "Aircraft", item.operator.name, statusText(item.active), statusText(item.verified)])} headings={["Registration", "Model", "Operator", "Active", "Verified"]} />;
  }

  if (dataset === "claims") {
    const rows = await db.claim.findMany({ include: { operator: true, user: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [item.operator.name, item.user?.email || "Invite not used", statusText(item.status), item.expiresAt.toLocaleDateString("en-IN"), item.createdAt.toLocaleDateString("en-IN")])} headings={["Operator", "Claimant", "Status", "Expires", "Created"]} />;
  }

  if (dataset === "rfqs") {
    const rows = await db.rfq.findMany({ include: { user: true, quotes: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [`${item.origin} to ${item.destination}`, item.user.email, `${item.passengers}`, statusText(item.status), `${item.quotes.length}`])} headings={["Route", "Customer", "Passengers", "Status", "Quotes"]} />;
  }

  if (dataset === "quotes") {
    const rows = await db.quote.findMany({ include: { operator: true, rfq: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [item.operator.name, `${item.rfq.origin} to ${item.rfq.destination}`, `Rs ${(item.price / 100000).toFixed(1)}L`, statusText(item.status), item.validUntil.toLocaleDateString("en-IN")])} headings={["Operator", "Route", "Price", "Status", "Valid until"]} />;
  }

  if (dataset === "bookings") {
    const rows = await db.booking.findMany({ include: { user: true, operator: true, aircraft: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [item.user.email, item.operator.name, `${item.origin} to ${item.destination}`, statusText(item.status), `Rs ${(item.price / 100000).toFixed(1)}L`])} headings={["Customer", "Operator", "Route", "Status", "Price"]} />;
  }

  if (dataset === "users") {
    const rows = await db.user.findMany({ include: { operator: true }, orderBy: { createdAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [item.name, item.email, item.role, item.operator?.name || "-", item.createdAt.toLocaleDateString("en-IN")])} headings={["Name", "Email", "Role", "Operator", "Created"]} />;
  }

  if (dataset === "availability") {
    const rows = await db.availability.findMany({ include: { operator: true, aircraft: true }, orderBy: { departureAt: "desc" }, take: 100 });
    return <AdminTable title={title} rows={rows.map((item) => [item.operator.name, item.aircraft.registration, `${item.origin} to ${item.destination}`, statusText(item.status), item.departureAt.toLocaleDateString("en-IN")])} headings={["Operator", "Aircraft", "Route", "Status", "Departure"]} />;
  }

  if (dataset === "aviation") {
    const [tracked, positions] = await Promise.all([db.aircraft.count({ where: { icao24: { not: null } } }), db.flightPosition.count()]);
    return <AdminTable title={title} rows={[["Tracked aircraft", `${tracked}`], ["Position records", `${positions}`], ["Provider", "OpenSky"]]} headings={["Metric", "Value"]} />;
  }

  const rows = await db.bookingEvent.findMany({ include: { booking: true }, orderBy: { createdAt: "desc" }, take: 100 });
  return <AdminTable title="Audit" rows={rows.map((item) => [item.actorRole || "System", "BOOKING_STATUS_CHANGED", item.bookingId, statusText(item.toStatus), item.createdAt.toLocaleString("en-IN")])} headings={["Actor", "Action", "Entity ID", "Status", "Timestamp"]} />;
}

function AdminTable({ title, headings, rows }: { title: string; headings: string[]; rows: string[][] }) {
  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="sectionHeading">
            <span>Admin</span>
            <h1>{title}</h1>
          </div>
          <div className="adminTableWrap">
            <table className="adminTable">
              <thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
              <tbody>
                {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="emptyState"><h2>No records.</h2><p>This area will fill as activity is created.</p></div>}
          <div className="actions"><Link className="luxuryButton light" href="/admin">OVERVIEW</Link></div>
        </div>
      </section>
    </main>
  );
}
