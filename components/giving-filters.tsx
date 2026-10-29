"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function GivingFilters({
  causes,
  total,
  children,
}: {
  causes: { slug: string; label: string; count: number }[];
  total: number;
  children: ReactNode;
}) {
  const [cause, setCause] = useState("all");
  const pending = useRef<string | null>(null);
  const active = cause === "all" ? total : (causes.find((item) => item.slug === cause)?.count ?? 0);

  useEffect(() => {
    if (cause !== "all" || !pending.current) return;
    const id = pending.current;
    pending.current = null;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [cause]);

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("#") || cause === "all") return;
    event.preventDefault();
    pending.current = href.slice(1);
    setCause("all");
  }

  return (
    <div className="give-board" data-cause={cause} onClick={onClick}>
      <div className="tabs" role="toolbar" aria-label="Filter by cause">
        <button type="button" className={cause === "all" ? "on" : undefined} aria-pressed={cause === "all"} onClick={() => setCause("all")}>
          All
        </button>
        {causes.map((item) => (
          <button
            key={item.slug}
            type="button"
            className={cause === item.slug ? "on" : undefined}
            aria-pressed={cause === item.slug}
            onClick={() => setCause(item.slug)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="empty-note" aria-live="polite">
        {active === 1 ? "1 place" : `${active} places`}
      </p>
      {children}
    </div>
  );
}
