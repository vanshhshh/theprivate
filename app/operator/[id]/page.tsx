import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import { calculateAircraftPrice } from "@/lib/pricing";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const operator = await db.operator.findUnique({ where: { id }, select: { name: true } });
  if (!operator) return {};
  return {
    title: `${operator.name} - ThePrivate`,
    description: `Verified operator profile and fleet information for ${operator.name}.`,
  };
}

export default async function Operator({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const operator = await db.operator.findUnique({
    where: { id },
    include: { aircraft: { where: { active: true }, orderBy: { registration: "asc" } }, pricing: true },
  });
  if (!operator) notFound();

  const priced = await Promise.all(
    operator.aircraft.slice(0, 12).map(async (aircraft) => ({
      ...aircraft,
      estimate: (await calculateAircraftPrice({ ...aircraft, operator }, "Delhi", "Mumbai")).finalPrice,
    })),
  );

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="topline">
            <div>
              <div className="eyebrow">Operator profile</div>
              <h1>{operator.name}</h1>
              <p className="muted">
                DGCA record {operator.dgcaId} / {operator.verified ? "Verified" : "Unverified"} / {operator.aircraft.length} active aircraft
              </p>
            </div>
            <Link className="btn light" href="/operator/login">Claim profile</Link>
          </div>

          <div className="resultList">
            {priced.map((aircraft) => (
              <article className="resultCard" key={aircraft.id}>
                <div>
                  <div className="pill">{aircraft.verified ? "Fleet verified" : "Awaiting verification"}</div>
                  <h2>{aircraft.model || aircraft.type || "Business aircraft"}</h2>
                  <p className="muted">{aircraft.registration} / {aircraft.seats || "-"} seats</p>
                </div>
                <div className="resultPrice">
                  <span>Delhi to Mumbai estimate</span>
                  <b>Rs {(aircraft.estimate / 100000).toFixed(1)}L</b>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
