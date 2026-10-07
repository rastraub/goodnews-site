"use client";

import { useState } from "react";
import { siteConfig } from "@/site.config";

export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${siteConfig.url}${path}`;
  const text = `${title} — ${siteConfig.name}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return;
      }
    }
    await copy();
  }

  return (
    <div className="share">
      <button type="button" onClick={nativeShare}>
        Share
      </button>
      <button type="button" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
        Post
      </a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a href={`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${title}\n${url}`)}`}>
        Email
      </a>
    </div>
  );
}
