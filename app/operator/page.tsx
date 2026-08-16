import Image from "next/image";
import { LuxuryButton, SectionHeading } from "@/components/luxury";
import { heroImage } from "@/lib/media";

export default function OperatorLanding() {
  return (
    <main>
      <section className="detailHero">
        <div className="detailHeroImage">
          <Image src={heroImage} alt="Private aircraft exterior" fill priority sizes="100vw" />
        </div>
        <div className="shell detailHeroContent">
          <span className="eyebrow">For operators</span>
          <h1>Your fleet is already here.</h1>
          <p>Claim the preloaded profile, verify aircraft, configure pricing and publish availability.</p>
          <LuxuryButton href="/operator/login" variant="light">OPERATOR ACCESS</LuxuryButton>
        </div>
      </section>
      <section className="section">
        <div className="shell">
          <SectionHeading eyebrow="Operating surface" title="Built around action, not dashboards.">
            Review requests, confirm aircraft, manage empty legs and keep pricing private to your team.
          </SectionHeading>
        </div>
      </section>
    </main>
  );
}
