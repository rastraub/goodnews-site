"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { bandFor } from "@/lib/map-bands";

const BANDS = ["band-0", "band-1", "band-2", "band-3", "band-4"];

export function NewsMapTools() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    const root = document.querySelector(".newsmap-page");
    if (!(root instanceof HTMLElement)) return;

    function selectedCategory(): string {
      const chosen = root?.querySelector<HTMLInputElement>('input[name="newsmap-cat"]:checked');
      return chosen?.value ?? "all";
    }

    function kidsOnly(): boolean {
      return root?.querySelector<HTMLInputElement>("#newsmap-kids")?.checked ?? false;
    }

    function apply() {
      if (!(root instanceof HTMLElement)) return;
      const category = selectedCategory();
      const kids = kidsOnly();
      const filtering = kids || category !== "all";
      const scope = filtering ? "in this filter" : "in the last 30 days";
      const stories = [...root.querySelectorAll<HTMLElement>(".newsmap-story")];
      const counts = new Map<string, number>();
      let visible = 0;
      for (const story of stories) {
        const match = (category === "all" || story.dataset.cat === category) && (!kids || story.dataset.kid === "1");
        story.classList.toggle("is-off", !match);
        if (!match) continue;
        visible += 1;
        const code = story.dataset.state ?? "";
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }

      for (const place of root.querySelectorAll<HTMLElement>(".newsmap-place")) {
        const any = [...place.querySelectorAll<HTMLElement>(".newsmap-story")].some((story) => !story.classList.contains("is-off"));
        place.classList.toggle("is-off", !any);
      }

      for (const section of root.querySelectorAll<HTMLElement>(".newsmap-state")) {
        const total = Number(section.dataset.total ?? "0");
        const shown = [...section.querySelectorAll<HTMLElement>(".newsmap-story")].filter((story) => !story.classList.contains("is-off")).length;
        const note = section.querySelector<HTMLElement>(".newsmap-filter-empty");
        if (note) note.hidden = !(total > 0 && shown === 0);
        const tally = section.querySelector<HTMLElement>(".newsmap-tally");
        const code = section.dataset.state ?? "";
        const count = counts.get(code) ?? 0;
        if (tally) {
          tally.textContent = count === 1 ? `1 story ${scope}.` : `${count} stories ${scope}.`;
        }
      }

      for (const jump of root.querySelectorAll<HTMLElement>(".newsmap-jump")) {
        const code = jump.dataset.state ?? "";
        const count = counts.get(code) ?? 0;
        jump.classList.toggle("has", count > 0);
        const badge = jump.querySelector<HTMLElement>(".count");
        if (badge) badge.textContent = String(count);
      }

      const max = [...counts.values()].reduce((peak, count) => Math.max(peak, count), 0);
      for (const shape of root.querySelectorAll<SVGElement>("[data-code]")) {
        const code = (shape.getAttribute("data-code") ?? "").toUpperCase();
        const band = bandFor(counts.get(code) ?? 0, max);
        for (const name of BANDS) shape.classList.remove(name);
        shape.classList.add(`band-${band}`);
      }

      for (const pin of root.querySelectorAll<SVGElement>("a.map-pin")) {
        const ids = (pin.getAttribute("data-pin") ?? "").split(/\s+/).filter(Boolean);
        const matched = stories.filter((story) => ids.includes(story.dataset.pin ?? "") && !story.classList.contains("is-off"));
        pin.classList.toggle("is-off", matched.length === 0);
        const text = pin.querySelector(".pin-count");
        if (text) text.textContent = matched.length > 1 ? String(matched.length) : "";
        const label = pin.getAttribute("data-label") ?? "Stories";
        const noun = matched.length === 1 ? "story" : "stories";
        pin.setAttribute("aria-label", `${label}, ${matched.length} ${noun}`);
      }

      setStatus(filtering ? `Showing ${visible} ${visible === 1 ? "story" : "stories"}.` : "");
    }

    apply();
    const controls = [...root.querySelectorAll<HTMLInputElement>("input")];
    for (const control of controls) control.addEventListener("change", apply);
    return () => {
      for (const control of controls) control.removeEventListener("change", apply);
    };
  }, []);

  return (
    <div className="newsmap-tools">
      <fieldset className="newsmap-fieldset">
        <legend>Category</legend>
        <div className="newsmap-choice-row">
          <span className="newsmap-choice">
            <input type="radio" name="newsmap-cat" id="newsmap-cat-all" value="all" defaultChecked />
            <label htmlFor="newsmap-cat-all">All</label>
          </span>
          {CATEGORIES.map((category) => (
            <span className="newsmap-choice" key={category.slug}>
              <input type="radio" name="newsmap-cat" id={`newsmap-cat-${category.slug}`} value={category.slug} />
              <label htmlFor={`newsmap-cat-${category.slug}`}>{category.label}</label>
            </span>
          ))}
        </div>
      </fieldset>
      <fieldset className="newsmap-fieldset">
        <legend>Classroom</legend>
        <span className="newsmap-choice">
          <input type="checkbox" id="newsmap-kids" />
          <label htmlFor="newsmap-kids">Kid-friendly</label>
        </span>
      </fieldset>
      <p className="newsmap-status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
