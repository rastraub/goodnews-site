import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getCategory } from "./categories";
import { readingMinutes } from "./format";
import { getStateByCode } from "./states";
import { storySchema, type StoryFrontmatter } from "./story-schema";

export type Story = StoryFrontmatter & {
  slug: string;
  body: string;
  minutes: number;
};

const STORIES_DIR = path.join(process.cwd(), "stories");

let cache: Story[] | null = null;

export function storiesDirectory(): string {
  return STORIES_DIR;
}

export function loadAllStories(): Story[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;

  if (!fs.existsSync(STORIES_DIR)) {
    throw new Error(`Missing stories directory at ${STORIES_DIR}`);
  }

  const files = fs.readdirSync(STORIES_DIR).filter((file) => file.endsWith(".md"));
  const errors: string[] = [];
  const stories: Story[] = [];
  const slugs = new Set<string>();
  const top5 = new Map<number, string>();

  for (const file of files) {
    const slug = file.slice(0, -3);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push(`${file}: filename must be kebab-case`);
      continue;
    }
    if (slugs.has(slug)) errors.push(`${file}: duplicate slug ${slug}`);
    slugs.add(slug);

    const raw = fs.readFileSync(path.join(STORIES_DIR, file), "utf8");
    const parsed = matter(raw);
    const result = storySchema.safeParse(parsed.data);
    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      errors.push(`${file}: ${details}`);
      continue;
    }

    const data = result.data;
    if (!data.draft && !data.editorApproved) {
      errors.push(`${file}: published stories must set editorApproved: true`);
    }
    if (data.emphasis && !data.title.includes(data.emphasis)) {
      errors.push(`${file}: emphasis must appear in the title`);
    }
    if (!getStateByCode(data.state)) {
      errors.push(`${file}: unknown state code ${data.state}`);
    }
    for (const extra of data.alsoStates) {
      if (!getStateByCode(extra)) errors.push(`${file}: unknown alsoStates code ${extra}`);
      if (extra === data.state) errors.push(`${file}: alsoStates should not repeat ${data.state}`);
    }
    if (!getCategory(data.category)) {
      errors.push(`${file}: unknown category ${data.category}`);
    }
    const imageFile = path.join(process.cwd(), "public", data.image.replace(/^\//, ""));
    const thumbFile = imageFile.replace(/\.webp$/, "-sm.webp");
    if (!fs.existsSync(imageFile)) {
      errors.push(`${file}: image not found at public${data.image}`);
    }
    if (!data.image.endsWith(".webp") || !fs.existsSync(thumbFile)) {
      errors.push(`${file}: add a 360px WebP thumbnail at public${data.image.replace(/\.webp$/, "-sm.webp")}`);
    }
    if (data.top5) {
      const previous = top5.get(data.top5);
      if (previous) errors.push(`${file}: top5 ${data.top5} is already used by ${previous}`);
      top5.set(data.top5, file);
    }

    const body = parsed.content.trim();
    if (body.split(/\s+/).filter(Boolean).length < 40) {
      errors.push(`${file}: body should be at least a short original summary (40 words)`);
    }

    stories.push({
      ...data,
      slug,
      body,
      minutes: readingMinutes(`${data.dek}\n${body}`),
    });
  }

  if (errors.length) {
    throw new Error(`Story validation failed:\n- ${errors.join("\n- ")}`);
  }

  stories.sort(compareStories);
  cache = stories;
  return stories;
}

export function compareStories(a: Story, b: Story): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const aRank = a.top5 ?? 99;
  const bRank = b.top5 ?? 99;
  if (aRank !== bRank) return aRank - bRank;
  return a.title.localeCompare(b.title);
}

export function getPublishedStories(): Story[] {
  return loadAllStories().filter((story) => !story.draft);
}

export function getStory(slug: string): Story | undefined {
  return getPublishedStories().find((story) => story.slug === slug);
}

export function getHero(stories = getPublishedStories()): Story | undefined {
  const featured = stories.filter((story) => story.featured).sort(compareStories);
  return featured[0] ?? stories[0];
}

export function getTop5(stories = getPublishedStories()): Story[] {
  const ranked = stories
    .filter((story) => story.top5)
    .sort((a, b) => (a.top5 ?? 99) - (b.top5 ?? 99));
  if (ranked.length >= 5) return ranked.slice(0, 5);
  const used = new Set(ranked.map((story) => story.slug));
  const rest = stories.filter((story) => !used.has(story.slug));
  return [...ranked, ...rest].slice(0, 5);
}

export function getByCategory(slug: string): Story[] {
  return getPublishedStories().filter((story) => story.category === slug);
}

export function getByState(code: string): Story[] {
  const upper = code.toUpperCase();
  return getPublishedStories().filter(
    (story) => story.state === upper || story.alsoStates.includes(upper),
  );
}

export function relatedStories(story: Story, limit = 3): Story[] {
  const pool = getPublishedStories().filter((item) => item.slug !== story.slug);
  const scored = pool
    .map((item) => {
      let score = 0;
      if (item.category === story.category) score += 2;
      if (item.state === story.state || item.alsoStates.includes(story.state) || story.alsoStates.includes(item.state)) {
        score += 2;
      }
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || compareStories(a.item, b.item));
  return scored.slice(0, limit).map((entry) => entry.item);
}

export function searchStories(query: string): Story[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return getPublishedStories();
  return getPublishedStories().filter((story) => {
    const haystack = [
      story.title,
      story.dek,
      story.city,
      story.state,
      story.place ?? "",
      story.category,
      story.sourceName,
      story.body,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export type StateCount = { code: string; count: number; latest: string };

export function stateCounts(stories = getPublishedStories()): StateCount[] {
  const map = new Map<string, StateCount>();
  for (const story of stories) {
    const codes = [story.state, ...story.alsoStates];
    for (const code of codes) {
      const current = map.get(code);
      if (!current) {
        map.set(code, { code, count: 1, latest: story.date });
      } else {
        current.count += 1;
        if (story.date > current.latest) current.latest = story.date;
      }
    }
  }
  return [...map.values()];
}
