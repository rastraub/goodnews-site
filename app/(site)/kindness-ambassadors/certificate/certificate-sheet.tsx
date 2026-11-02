"use client";

import { useState } from "react";
import { PrintButton } from "@/app/(site)/kids/print-button";
import { siteConfig } from "@/site.config";

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export function CertificateSheet() {
  const [className, setClassName] = useState("");
  const [date, setDate] = useState("");

  return (
    <div className="cert-wrap">
      <p className="teacher-note no-print">
        Type the class or group name and the date. They stay on this page only. Nothing is sent or saved. Do not add a student&apos;s name.
      </p>
      <div className="cert-actions no-print">
        <PrintButton label="Print the certificate" />
        <button type="button" className="btn btn-outline" onClick={() => setDate(todayLabel())}>
          Use today&apos;s date
        </button>
      </div>
      <form className="cert-sheet print-sheet" onSubmit={(event) => event.preventDefault()}>
        <p className="cert-kicker">{siteConfig.name}</p>
        <h2>Kindness Ambassador</h2>
        <p className="cert-lead">This certifies that</p>
        <label>
          <span className="sr">Class or group name</span>
          <input
            className="cert-blank"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            maxLength={80}
            placeholder="Class or group name"
            autoComplete="off"
            aria-label="Class or group name"
          />
          <span className="cert-filled print-only">{className || "\u00a0"}</span>
        </label>
        <p className="cert-line">is a Kindness Ambassador class, for one small, free act of kindness a week.</p>
        <label>
          <span className="sr">Date</span>
          <input
            className="cert-blank"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            maxLength={40}
            placeholder="Date"
            autoComplete="off"
            aria-label="Date"
          />
          <span className="cert-filled print-only">{date || "\u00a0"}</span>
        </label>
        <p className="cert-line">This certificate names the class or group, not a student.</p>
        <p className="cert-publisher">
          {siteConfig.name} · {siteConfig.url.replace(/^https:\/\//, "")} · Published by {siteConfig.owner.name}
        </p>
      </form>
    </div>
  );
}
