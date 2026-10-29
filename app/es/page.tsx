import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { spanishLandingDescription, spanishLandingJsonLd, spanishPageMeta, SPANISH_TRANSLATION_NOTE } from "@/lib/spanish-editions";
import { siteConfig } from "@/site.config";

export const dynamic = "force-static";

const TITLE = "Buenas noticias en español";

export const metadata: Metadata = spanishPageMeta({
  title: TITLE,
  description: spanishLandingDescription(),
  path: "/es",
  languages: { es: "/es", "x-default": "/es" },
});

export default function SpanishLandingPage() {
  return (
    <div className="page-block">
      <JsonLd data={spanishLandingJsonLd()} />
      <div className="wrap page-hero">
        <p className="kicker">En español</p>
        <h1>Buenas noticias en español.</h1>
        <p className="lede">{spanishLandingDescription()}</p>
        <p className="translation-note">{SPANISH_TRANSLATION_NOTE}</p>
        <p className="link-pills">
          <Link href="/es/buenas-noticias">Ver las ediciones</Link>
          <Link href="/es/rss.xml">RSS en español</Link>
          <Link href="/" hrefLang="en" lang="en">
            English
          </Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 8, paddingBottom: 48 }}>
        <p className="lede">
          Cada lunes empieza una semana. Cuando esa semana ya tiene historias en {siteConfig.name}, publicamos cinco: un titular, un resumen corto, el lugar y el crédito de la fuente. La nota completa sigue en inglés.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-ink" href="/es/buenas-noticias">
            Las 5 de la semana
          </Link>
        </p>
      </div>
    </div>
  );
}
