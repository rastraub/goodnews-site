"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { activeHomepageBanner } from "@/lib/homepage-banner";
import { newsBreakBanner } from "@/site.config";

function subscribe() {
  return () => {};
}

/** Client clock. The server snapshot stays hidden so a static build does not freeze the window. */
function bannerVisible() {
  return activeHomepageBanner() === "news-break";
}

function bannerHidden() {
  return false;
}

export function NewsBreakBanner() {
  const show = useSyncExternalStore(subscribe, bannerVisible, bannerHidden);
  if (!show) return null;

  return (
    <div className="break-banner">
      <div className="wrap">
        <Link href={newsBreakBanner.path}>
          {newsBreakBanner.label}
          <svg className="ico" aria-hidden="true">
            <use href="#i-arrow" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
