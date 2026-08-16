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
        <div className="shell accountGrid">
          <div className="surface">
            <span className="microLabel">Trip</span>
            <RouteDisplay from={booking.origin} to={booking.destination} />
            <h1>{booking.aircraft?.model || "Private aircraft"}</h1>
            <p className="muted">{booking.departureAt.toLocaleString("en-IN")} / {booking.passengers} passengers</p>
            <PriceDisplay value={booking.price} />
            <div className="detailRows">
              <p><b>Status</b><span>{booking.status.replaceAll("_", " ")}</span></p>
              <p><b>Aircraft</b><span>{booking.aircraft?.registration || "To be confirmed"}</span></p>
              <p><b>Flight partner</b><span>{booking.operator.name}</span></p>
            </div>
          </div>
          <aside className="surface">
            <span className="microLabel">Timeline</span>
            <div className="timeline">
              {booking.events.map((event) => (
                <div className="timelineItem" key={event.id}>
                  <b>{event.toStatus.replaceAll("_", " ")}</b>
                  <span>{event.createdAt.toLocaleString("en-IN")}</span>
                  {event.note && <p>{event.note}</p>}
                </div>
              ))}
              {!booking.events.length && <p className="muted">No trip activity yet.</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
