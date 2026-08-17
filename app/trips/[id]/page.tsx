import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PriceDisplay, RouteDisplay } from "@/components/luxury";

export default async function TripDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const booking = await db.booking.findFirst({
    where: { id, userId: user.id },
    include: { aircraft: true, operator: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!booking) notFound();

  return (
    <main>
      <section className="section">
        <div className="shell" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: "var(--space-7)" }}>
            <span className="eyebrow">Trip</span>
            <div style={{ marginTop: "var(--space-3)" }}>
              <RouteDisplay from={booking.origin} to={booking.destination} />
            </div>
            <h1 style={{ marginTop: "var(--space-3)", marginBottom: "var(--space-2)" }}>{booking.aircraft?.model || "Private aircraft"}</h1>
            <p className="muted">{booking.departureAt.toLocaleString("en-US")} / {booking.passengers} passengers</p>
          </div>

          <div style={{ display: "grid", gap: "var(--space-1)", borderTop: "var(--border)", borderLeft: "var(--border)", marginBottom: "var(--space-7)" }}>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Details</span>
              <div style={{ marginTop: "var(--space-3)", display: "grid", gap: "var(--space-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Status</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, textTransform: "capitalize" }}>{booking.status.replaceAll("_", " ")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0", borderBottom: "var(--border-subtle)" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Aircraft</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{booking.aircraft?.registration || "To be confirmed"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "var(--space-2) 0" }}>
                  <span className="muted" style={{ fontSize: "var(--text-sm)" }}>Flight partner</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{booking.operator.name}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: "var(--space-5)", background: "var(--white)", borderRight: "var(--border)", borderBottom: "var(--border)" }}>
              <span className="eyebrow">Price</span>
              <div style={{ marginTop: "var(--space-3)" }}>
                <PriceDisplay value={booking.price} label={booking.status === "CONFIRMED" ? "Confirmed price" : "Estimated price"} />
              </div>
            </div>
          </div>

          <div>
            <span className="eyebrow">Timeline</span>
            <h3 style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-4)" }}>Booking history.</h3>
            <div style={{ display: "grid", gap: "var(--space-4)" }}>
              {booking.events.map((event) => (
                <div key={event.id} style={{ paddingLeft: "var(--space-4)", borderLeft: "2px solid var(--accent)" }}>
                  <b style={{ fontSize: "var(--text-sm)", textTransform: "capitalize" }}>{event.toStatus.replaceAll("_", " ")}</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--text-xs)", marginTop: "var(--space-1)" }}>{event.createdAt.toLocaleString("en-US")}</span>
                  {event.note && <p style={{ fontSize: "var(--text-sm)", marginTop: "var(--space-1)" }}>{event.note}</p>}
                </div>
              ))}
              {!booking.events.length && <p className="muted">No trip activity yet.</p>}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
