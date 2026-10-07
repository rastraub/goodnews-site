import { getCategory } from "./categories";
import { formatStoryDate } from "./format";
import { getStateByCode, stateName } from "./states";
import type { Story } from "./stories";

export type StoryCardModel = {
  slug: string;
  title: string;
  shortTitle: string;
  emphasis?: string;
  dek: string;
  place: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  image: string;
  imageAlt: string;
  imageTreatment: "none" | "warm";
  sourceName: string;
  sourceUrl: string;
  dateLabel: string;
  minutes: number;
  cheers: number;
  stateCode: string;
  stateSlug: string;
};

export function placeLabel(story: Pick<Story, "city" | "state" | "place">): string {
  if (story.place) return story.place;
  const name = stateName(story.state);
  return story.city ? `${story.city}, ${name}` : name;
}

export function toCard(story: Story): StoryCardModel {
  const category = getCategory(story.category);
  return {
    slug: story.slug,
    title: story.title,
    shortTitle: story.shortTitle ?? story.title,
    emphasis: story.emphasis,
    dek: story.dek,
    place: placeLabel(story),
    category: story.category,
    categoryLabel: category?.label ?? story.category,
    categoryColor: category?.color ?? "#24537F",
    image: story.image,
    imageAlt: story.imageAlt,
    imageTreatment: story.imageTreatment,
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl,
    dateLabel: formatStoryDate(story.date),
    minutes: story.minutes,
    cheers: story.cheers,
    stateCode: story.state,
    stateSlug: getStateByCode(story.state)?.slug ?? story.state.toLowerCase(),
  };
}
