import type { Metadata } from "next";
import { EmailSignup } from "@/components/email-signup";
import { siteConfig } from "@/site.config";

export const metadata: Metadata = {
  title: "Membership",
  description: `An ad-free ${siteConfig.name} for about $3 a month. Billing is not open yet.`,
  alternates: { canonical: "/membership" },
};

export default function MembershipPage() {
  return (
    <div className="page-block">
      <div className="wrap page-hero prose-page">
        <p className="kicker">Membership</p>
        <h1>Go ad-free for $3 a month.</h1>
        <p className="lede">
          Members keep {siteConfig.name} free for everyone and get a calm, ad-free site in return. Billing is not open yet. Leave your email and we will tell you when it is.
        </p>
        <div style={{ marginTop: 24, maxWidth: 560 }}>
          <EmailSignup variant="inline" interest="membership" id="member-waitlist" />
        </div>
        <p style={{ marginTop: 18 }}>
          Payments are a later step. Nothing here charges a card.
        </p>
      </div>
    </div>
  );
}
