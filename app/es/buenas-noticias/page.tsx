import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { StoryImage } from "@/components/story-image";
import {
  loadSpanishEditions,
  spanishIndexDescription,
  spanishIndexJsonLd,
  spanishIndexLanguages,
  spanishIndexTitle,
  spanishPageMeta,
  SPANISH_TRANSLATION_NOTE,
} from "@/lib/spanish-editions";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const editions = loadSpanishEditions();
  const newest = editions[editions.length - 1];
  return spanishPageMeta({
    title: spanishIndexTitle(),
    description: spanishIndexDescription(editions.length),
    path: "/es/buenas-noticias",
    languages: spanishIndexLanguages(),
    image: newest ? { url: newest.image, alt: newest.imageAlt } : undefined,
  });
}

export default function SpanishEditionIndexPage() {
  const editions = loadSpanishEditions();
  const newestFirst = editions.slice().reverse();

  return (
    <div className="page-block">
      <JsonLd data={spanishIndexJsonLd(editions)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/es">Inicio</Link>
          <span aria-hidden="true">/</span>
          <span>Buenas noticias</span>
        </p>
        <p className="kicker">Cada semana</p>
        <h1>Las 5 buenas noticias de la semana.</h1>
        <p className="lede">
          Una edición por semana, de lunes a domingo, con cinco historias. La semana en curso dice «hasta ahora» hasta que pasa el domingo. La página en inglés de esa misma semana tiene el resto de las notas.
        </p>
        <p className="translation-note">{SPANISH_TRANSLATION_NOTE}</p>
        <p className="link-pills">
          <Link href="/es/rss.xml">RSS en español</Link>
          <Link href="/week" hrefLang="en" lang="en">
            This week in English
          </Link>
          <Link href="/es">Inicio en español</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        {newestFirst.length ? (
          <div className="week-index">
            {newestFirst.map((edition) => (
              <Link key={edition.start} href={edition.path} className="week-row">
                <span className="week-row-img" lang="en">
                  <StoryImage src={edition.image} alt={edition.imageAlt} sizes="(max-width: 700px) 100vw, 180px" />
                </span>
                <span>
                  <span className="kicker">{edition.inProgress ? "Hasta ahora" : "Semana"}</span>
                  <h2>{edition.title}</h2>
                  <p>{edition.intro}</p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>Todavía no hay una edición.</h2>
            <p style={{ margin: "8px 0 0", color: "var(--ink2)" }}>Las historias del día siguen en la portada en inglés.</p>
          </div>
        )}
      </div>
    </div>
  );
}
