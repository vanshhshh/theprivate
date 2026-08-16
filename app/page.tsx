import Image from "next/image";
import { SearchPanel, SectionHeading } from "@/components/luxury";
import { heroImage, loungeImage } from "@/lib/media";

export default function Home() {
  return (
    <main>
      <section className="heroLuxury">
        <div className="heroMedia">
          <Image src={heroImage} alt="Private jet on a quiet runway" fill priority sizes="100vw" />
        </div>
        <div className="shell heroContent">
          <div className="heroCopy">
            <div className="eyebrow">THE PRIVATE</div>
            <h1>PRIVATE AVIATION. WITHOUT THE FRICTION.</h1>
            <p>Pick an empty leg, book a full charter, or request a quote in one place.</p>
          </div>
          <SearchPanel defaultFrom="Delhi" defaultTo="Dubai" />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <SectionHeading eyebrow="Simple choices" title="Choose how you want to fly.">
            Search available aircraft, request a full charter, or ask us to source a quote.
          </SectionHeading>
          <div className="editorialGrid">
            <div className="editorialTile">
              <span className="microLabel">Empty legs</span>
              <h3>Pick a ready route.</h3>
              <p className="muted">See confirmed empty-leg opportunities when they are available.</p>
            </div>
            <div className="editorialTile">
              <span className="microLabel">Whole charter</span>
              <h3>Book the aircraft you need.</h3>
              <p className="muted">Choose your route, date and passengers, then request confirmation.</p>
            </div>
            <div className="editorialTile">
              <span className="microLabel">Quotation</span>
              <h3>Ask us to source it.</h3>
              <p className="muted">If nothing fits, send one quote request and we will bring options back.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="shell aircraftCard">
          <div className="aircraftImage">
            <Image src={loungeImage} alt="Private aviation lounge" fill sizes="(max-width: 860px) 100vw, 520px" />
          </div>
          <div className="aircraftBody">
            <span className="microLabel">Empty legs</span>
            <h2>Fly a route already in motion.</h2>
            <p className="muted">When an aircraft is available on your route, you can request it quickly and clearly.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
