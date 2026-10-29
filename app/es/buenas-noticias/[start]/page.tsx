import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { SpanishStory } from "@/components/spanish-story";
import {
  getSpanishEdition,
  loadSpanishEditions,
  spanishEditionJsonLd,
  spanishEditionLanguages,
  spanishPageMeta,
  SPANISH_TRANSLATION_NOTE,
  type SpanishEdition,
} from "@/lib/spanish-editions";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ start: string }> };

export function generateStaticParams() {
  return loadSpanishEditions().map((edition) => ({ start: edition.start }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { start } = await params;
  const edition = getSpanishEdition(start);
  if (!edition) return {};
  return spanishPageMeta({
    title: edition.title,
    description: edition.intro,
    path: edition.path,
    languages: spanishEditionLanguages(edition.start),
    image: { url: edition.image, alt: edition.imageAlt },
  });
}

function EditionNav({
  previous,
  next,
}: {
  previous?: SpanishEdition;
  next?: SpanishEdition;
}) {
  return (
    <nav className="pager" aria-label="Ediciones">
      {previous ? <Link href={previous.path}>Semana anterior</Link> : <span className="muted">Semana anterior</span>}
      <Link href="/es/buenas-noticias">Todas las ediciones</Link>
      {next ? <Link href={next.path}>Semana siguiente</Link> : <span className="muted">Semana siguiente</span>}
    </nav>
  );
}

export default async function SpanishEditionPage({ params }: Props) {
  const { start } = await params;
  const editions = loadSpanishEditions();
  const index = editions.findIndex((edition) => edition.start === start);
  if (index < 0) notFound();
  const edition = editions[index];
  const previous = index > 0 ? editions[index - 1] : undefined;
  const next = index < editions.length - 1 ? editions[index + 1] : undefined;

  return (
    <div className="page-block">
      <JsonLd data={spanishEditionJsonLd(edition)} />
      <div className="wrap page-hero">
        <p className="crumbs">
          <Link href="/es">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link href="/es/buenas-noticias">Buenas noticias</Link>
          <span aria-hidden="true">/</span>
          <span>{edition.rangeLabel}</span>
        </p>
        <p className="kicker">{edition.inProgress ? "Hasta ahora" : "Esta semana"}</p>
        <h1>{edition.heading}</h1>
        <p className="lede">{edition.intro}</p>
        <p className="translation-note">{SPANISH_TRANSLATION_NOTE}</p>
        <p className="link-pills">
          {previous ? <Link href={previous.path}>Semana anterior</Link> : null}
          <Link href="/es/buenas-noticias">Todas las ediciones</Link>
          {next ? <Link href={next.path}>Semana siguiente</Link> : null}
          <Link href={edition.englishPath} hrefLang="en" lang="en">
            Semana en inglés
          </Link>
          <Link href="/es/rss.xml">RSS en español</Link>
        </p>
      </div>
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="es-stories">
          {edition.stories.map((story) => (
            <SpanishStory key={story.slug} story={story} />
          ))}
        </div>
        <EditionNav previous={previous} next={next} />
      </div>
    </div>
  );
}
