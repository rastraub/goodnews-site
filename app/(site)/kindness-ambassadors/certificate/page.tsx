import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { AMBASSADOR_CERTIFICATE_PATH, AMBASSADORS_PATH, ambassadorSignupHref } from "@/lib/ambassador-tip";
import { certificateJsonLd } from "@/lib/kindness-ambassadors";
import { listingMeta } from "@/lib/seo";
import { siteConfig } from "@/site.config";
import { CertificateSheet } from "./certificate-sheet";

export const dynamic = "force-static";

const TITLE = "Kindness Ambassador certificate";
const DESCRIPTION =
  "Print a Kindness Ambassador certificate for a class or student group. Type the class name and the date on the page. Nothing is saved, and the certificate does not name a student.";

export function generateMetadata(): Metadata {
  return listingMeta({
    title: TITLE,
    description: DESCRIPTION,
    base: AMBASSADOR_CERTIFICATE_PATH,
    page: 1,
    total: 1,
  });
}

export default function CertificatePage() {
  return (
    <div className="page-block">
      <JsonLd data={certificateJsonLd()} />
      <div className="wrap page-hero kindness-layout">
        <p className="crumbs no-print">
          <Link href="/">Today</Link>
          <span aria-hidden="true">/</span>
          <Link href={AMBASSADORS_PATH}>Kindness Ambassadors</Link>
          <span aria-hidden="true">/</span>
          <span>Certificate</span>
        </p>
        <p className="kicker no-print">For teachers · Print at school</p>
        <h1 className="no-print">Kindness Ambassador certificate.</h1>
        <p className="lede no-print">
          Fill in the class or group name and the date, then print. {siteConfig.name} does not store what you type. Leave student names off the certificate.
        </p>
        <p className="link-pills no-print">
          <Link href={AMBASSADORS_PATH}>About the program</Link>
          <Link href={ambassadorSignupHref()}>Kindness Ambassadors class signup</Link>
        </p>
        <CertificateSheet />
      </div>
    </div>
  );
}
