"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AirportCombobox, DatePicker, LuxuryButton, PassengerSelector } from "@/components/luxury";

function CharterRequestContent() {
  const query = useSearchParams();
  const [origin, setOrigin] = useState(query.get("from") || "Delhi");
  const [destination, setDestination] = useState(query.get("to") || "Dubai");
  const [departureAt, setDepartureAt] = useState("");
  const [returnAt, setReturnAt] = useState("");
  const [passengers, setPassengers] = useState(Number(query.get("pax") || 6));
  const [preference, setPreference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    setSending(true);
    setMessage("");
    const response = await fetch("/api/rfq", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        origin,
        destination,
        departureAt: departureAt ? new Date(departureAt).toISOString() : new Date().toISOString(),
        passengers,
        notes: [preference, notes, returnAt ? `Return: ${returnAt}` : ""].filter(Boolean).join("\n"),
      }),
    });
    const json = await response.json();
    setMessage(response.ok ? "Quote request sent." : json.error || "Could not send request.");
    setSending(false);
  }

  return (
    <main>
      <section className="section">
        <div className="shell">
          <div className="sectionHeading">
            <span>Private charter</span>
            <h1>We can source an aircraft for you.</h1>
            <p>Tell us the trip. We will source options.</p>
          </div>

          <div className="stepLayout">
            <div className="stepPanel">
              <div className="stepNumber">01</div>
              <div className="stepBody">
                <h2>Where are you going?</h2>
                <div className="twoColumn">
                  <AirportCombobox label="FROM" value={origin} onChange={setOrigin} />
                  <AirportCombobox label="TO" value={destination} onChange={setDestination} />
                </div>
              </div>
            </div>

            <div className="stepPanel">
              <div className="stepNumber">02</div>
              <div className="stepBody">
                <h2>When?</h2>
                <div className="twoColumn">
                  <DatePicker label="DEPARTURE" value={departureAt} onChange={setDepartureAt} />
                  <DatePicker label="RETURN" value={returnAt} onChange={setReturnAt} />
                </div>
              </div>
            </div>

            <div className="stepPanel">
              <div className="stepNumber">03</div>
              <div className="stepBody">
                <h2>Who is flying?</h2>
                <PassengerSelector value={passengers} onChange={setPassengers} />
              </div>
            </div>

            <div className="stepPanel">
              <div className="stepNumber">04</div>
              <div className="stepBody">
                <h2>What do you need?</h2>
                <input placeholder="Aircraft preference" value={preference} onChange={(event) => setPreference(event.target.value)} />
                <textarea rows={5} placeholder="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                <LuxuryButton onClick={submit} disabled={sending}>{sending ? "REQUESTING" : "REQUEST CHARTER"}</LuxuryButton>
                {message && <p className="notice">{message}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CharterRequest() {
  return (
    <Suspense fallback={<main><div className="shell section">Loading...</div></main>}>
      <CharterRequestContent />
    </Suspense>
  );
}
