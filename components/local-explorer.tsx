"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getStateByCode, stateFromZip, STATES } from "@/lib/states";

const UsMap = dynamic(() => import("./us-map").then((mod) => mod.UsMap), {
  ssr: false,
  loading: () => (
    <div className="map" aria-hidden="true">
      <div className="map-canvas" />
    </div>
  ),
});

export type NewsChip = { href: string; label: string; count?: number };

export function StateJump({ code }: { code: string }) {
  const router = useRouter();
  return (
    <label className="select" style={{ marginTop: 16 }}>
      <svg className="ico" aria-hidden="true">
        <use href="#i-pin" />
      </svg>
      <span className="sr">Jump to a state</span>
      <select
        value={code}
        aria-label="Choose a state"
        onChange={(event) => {
          const next = getStateByCode(event.target.value);
          if (next) router.push(`/state/${next.slug}`);
        }}
      >
        {STATES.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name}
          </option>
        ))}
      </select>
      <svg className="ico chev" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </label>
  );
}

export function LocalExplorer({
  highlighted,
  chips,
  defaultCode = "CO",
}: {
  highlighted: string[];
  chips: NewsChip[];
  defaultCode?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState(defaultCode);
  const [zipOpen, setZipOpen] = useState(false);
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState("");
  const selected = getStateByCode(code);
  const home = (selected?.code ?? defaultCode).toLowerCase();
  const highlightKey = highlighted.join(",");
  const stableHighlights = useMemo(() => highlightKey.split(",").filter(Boolean), [highlightKey]);

  function onZip(event: React.FormEvent) {
    event.preventDefault();
    const match = stateFromZip(zip);
    if (!match) {
      setZipError("We couldn't match that ZIP. Pick a state instead.");
      return;
    }
    router.push(`/state/${match.slug}`);
  }

  return (
    <section className="local" id="local">
      <div className="wrap">
        <div className="local-card">
          <div className="local-copy">
            <span className="badge-new">
              <svg className="ico" aria-hidden="true">
                <use href="#i-pin" />
              </svg>
              Good news near you
            </span>
            <h2>Your state has good news today, too.</h2>
            <p>Pick your state or town to see the kind people, small wins, and big comebacks happening close to home.</p>
            <div className="picker">
              <label className="select">
                <svg className="ico" aria-hidden="true">
                  <use href="#i-pin" />
                </svg>
                <span className="sr">Choose a state</span>
                <select value={code} onChange={(event) => setCode(event.target.value)}>
                  {STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                <svg className="ico chev" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </label>
              <Link className="btn btn-ink" href={selected ? `/state/${selected.slug}` : "/local"}>
                Show me
              </Link>
            </div>
            <div className="zip">
              {zipOpen ? (
                <form onSubmit={onZip} className="zip-form">
                  <input
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="ZIP code"
                    aria-label="ZIP code"
                    value={zip}
                    onChange={(event) => setZip(event.target.value)}
                    maxLength={10}
                  />
                  <button className="btn btn-ink" type="submit">
                    Go
                  </button>
                </form>
              ) : (
                <>
                  Or{" "}
                  <button type="button" onClick={() => setZipOpen(true)}>
                    use my ZIP code
                  </button>{" "}
                  for news from your town
                </>
              )}
              {zipError ? <div className="error">{zipError}</div> : null}
            </div>
            <div className="chips">
              {chips.map((chip) => (
                <Link key={chip.href + chip.label} href={chip.href} className="chip">
                  {chip.label}
                  {chip.count ? <b>{chip.count} new</b> : null}
                </Link>
              ))}
              <Link href="/local" className="chip">
                See all 50 states
              </Link>
            </div>
          </div>
          <UsMap home={home} highlighted={stableHighlights} />
        </div>
      </div>
    </section>
  );
}
