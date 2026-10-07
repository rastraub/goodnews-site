import type { Metadata } from "next";
import { EmailSignup } from "@/components/email-signup";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Subscribe",
  description: `The daily Top 5 from ${siteConfig.name}. Five true stories, two minutes, every morning.`,
  alternates: { canonical: "/subscribe" },
};

export default function SubscribePage() {
  return (
    <div className="page-block" style={{ paddingBottom: 0 }}>
      <div className="wrap page-hero">
        <p className="kicker">Daily Top 5</p>
        <h1>Five stories. Two minutes. Every morning.</h1>
        <p className="lede">
          A short email from {siteConfig.name}, free, with the same verified stories as the site. No pop-ups in your inbox, and we never sell the address.
        </p>
      </div>
      <EmailSignup />
    </div>
  );
}
