"use client";

import dynamic from "next/dynamic";

const NewsMapTools = dynamic(() => import("./news-map-tools").then((mod) => mod.NewsMapTools), {
  ssr: false,
  loading: () => (
    <p className="newsmap-filter-note">
      Category and kid-friendly filters load with the page. The list below already includes every story from the last 30 days.
    </p>
  ),
});

export function NewsMapToolsLoader() {
  return <NewsMapTools />;
}
