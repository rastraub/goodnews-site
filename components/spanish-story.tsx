import Link from "next/link";
import { StoryImage } from "./story-image";
import type { SpanishEditionStory } from "@/lib/spanish-editions";

export function SpanishStory({ story }: { story: SpanishEditionStory }) {
  return (
    <article className="es-story" id={story.slug} aria-labelledby={`story-${story.slug}`}>
      <div className="week-row-img" lang="en">
        <StoryImage
          src={story.image}
          alt={story.imageAlt}
          sizes="(max-width: 700px) 100vw, 220px"
          treatment={story.imageTreatment}
        />
      </div>
      <div>
        <p className="es-place">{story.place}</p>
        <h2 id={`story-${story.slug}`}>{story.headline}</h2>
        <p>{story.summary}</p>
        {story.kidLine ? (
          <p className="es-kid">
            <strong>Para la clase: </strong>
            {story.kidLine}
          </p>
        ) : null}
        <p className="es-meta">
          Fuente:{" "}
          <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
            {story.sourceName}
          </a>
          {" · "}
          <Link href={story.storyPath} hrefLang="en" lang="en">
            Leer la nota en inglés
          </Link>
        </p>
      </div>
    </article>
  );
}
