import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Contact",
  description: `Write to ${siteConfig.name}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Hello</p>
        <h1>Contact</h1>
        <p className="lede">
          Email <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>. For a story tip, the form is faster.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/submit">Submit a story</Link>
        </p>
      </div>
    </div>
  );
}
