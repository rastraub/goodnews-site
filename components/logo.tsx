import Link from "next/link";
import { siteConfig } from "@/site.config";

export function Logo() {
  return (
    <Link href="/" className="logo">
      <svg aria-hidden="true">
        <use href="#logo" />
      </svg>
      <div className="name">
        {siteConfig.logoText}
        <small>{siteConfig.tagline}</small>
      </div>
    </Link>
  );
}
