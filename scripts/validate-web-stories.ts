/**
 * Check web-story selection, poster size, and AMP validity.
 * The validator runs offline after validator_wasm.js is cached.
 * The first run downloads it from the AMP CDN when the cache is empty.
 */
import fs from "fs";
import path from "path";
import amphtmlValidator from "amphtml-validator";
import { readImageSize } from "../lib/feed-image";
import { getPublishedStories, getTop5, type Story } from "../lib/stories";
import { escapeHtml } from "../lib/tip-mail";
import { formatLongDate } from "../lib/weeks";
import {
  COVER_TITLE,
  listWebStories,
  renderWebStoryDocument,
  selectWebStoryStories,
  storyPageCopy,
  type WebStoryEdition,
  SUBSCRIBE_CTA,
  SUBSCRIBE_DEK,
  SUBSCRIBE_TITLE,
  WEB_STORY_POSTER,
  WEB_STORY_POSTER_MIN,
  WEB_STORY_WORDS,
  wordCount,
  READ_CTA,
} from "../lib/web-stories";
import { absoluteUrl } from "../lib/seo";
import { SQUARE_LOGO } from "../lib/brand";
import { siteConfig } from "../site.config";

const VALIDATOR_FILE = path.join(process.cwd(), "node_modules", ".cache", "validator_wasm.js");
const VALIDATOR_URL = "https://cdn.ampproject.org/v0/validator_wasm.js";

type Candidate = {
  slug: string;
  date: string;
  title: string;
  featured?: boolean;
  top5?: number;
};

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertSelection(): Story[] {
  const ranked: Candidate[] = [
    { slug: "b", date: "2026-10-02", title: "Bravo story here", featured: true, top5: 2 },
    { slug: "a", date: "2026-10-02", title: "Alpha story here", featured: false, top5: 1 },
    { slug: "c", date: "2026-10-02", title: "Charlie story here", featured: true },
  ];
  const picked = selectWebStoryStories(ranked).map((story) => story.slug).join();
  assert(picked === "a,b,c", `Top 5 ranks should lead the web story, got ${picked}`);

  const open: Candidate[] = [
    { slug: "b", date: "2026-10-03", title: "Bravo story here", featured: false },
    { slug: "a", date: "2026-10-03", title: "Alpha story here", featured: true },
    { slug: "c", date: "2026-10-01", title: "Charlie story here", featured: false },
  ];
  const fallback = selectWebStoryStories(open);
  assert(fallback[0]?.slug === "a", "Without ranks, the featured story should be first.");
  assert(fallback[1]?.slug === "b", "Without ranks, newer stories should follow the featured story.");
  assert(fallback[2]?.slug === "c", "Without ranks, older stories should follow newer ones.");

  const many: Candidate[] = Array.from({ length: 8 }, (_, index) => ({
    slug: `s${index}`,
    date: "2026-10-04",
    title: `Story number ${index}`,
    featured: index === 7,
  }));
  const five = selectWebStoryStories(many);
  assert(five.length === 5 && five[0]?.slug === "s7", "A day should keep five stories, with the featured story first.");

  const published = getPublishedStories();
  if (published.some((story) => story.top5)) {
    const site = getTop5(published).map((story) => story.slug).join();
    const same = selectWebStoryStories(published).map((story) => story.slug).join();
    assert(site === same, "Web story selection should match the daily Top 5 when ranks exist.");
  }

  const editions = listWebStories(published);
  const dates = new Set(published.map((story) => story.date));
  assert(editions.length === dates.size, "Every published date should have a web story.");
  for (const edition of editions) {
    assert(edition.stories.length >= 1 && edition.stories.length <= 5, `${edition.date} should have 1 to 5 stories.`);
    for (const story of edition.stories) {
      assert(story.date === edition.date, `${edition.date} includes ${story.slug} from ${story.date}.`);
      const copy = storyPageCopy(story);
      for (const line of [copy.place, copy.title, copy.dek]) {
        assert(wordCount(line) <= WEB_STORY_WORDS, `${story.slug} line is over ${WEB_STORY_WORDS} words: ${line}`);
      }
    }
    for (const line of [COVER_TITLE, formatLongDate(edition.date), SUBSCRIBE_TITLE, SUBSCRIBE_DEK]) {
      assert(wordCount(line) <= WEB_STORY_WORDS, `${edition.date} line is over ${WEB_STORY_WORDS} words: ${line}`);
    }
  }
  return published;
}

function assertPosters(editions: WebStoryEdition[]) {
  for (const edition of editions) {
    const file = path.join(process.cwd(), "public", edition.posterPath.replace(/^\//, ""));
    assert(fs.existsSync(file), `Missing poster ${edition.posterPath}. Run npm run web-story-posters.`);
    const size = readImageSize(fs.readFileSync(file));
    const ratio = size ? size.width / size.height : 0;
    assert(
      size &&
        size.width >= WEB_STORY_POSTER_MIN.width &&
        size.height >= WEB_STORY_POSTER_MIN.height &&
        size.width === WEB_STORY_POSTER.width &&
        size.height === WEB_STORY_POSTER.height &&
        Math.abs(ratio - 3 / 4) <= 0.01,
      `Poster ${edition.posterPath} is ${size?.width ?? 0}x${size?.height ?? 0}.`,
    );
  }
}

function assertDocument(html: string, edition: WebStoryEdition) {
  const date = edition.date;
  const canonical = absoluteUrl(edition.path);
  assert(html.startsWith("<!doctype html>"), `${date} should be a standalone document.`);
  assert(html.includes("<html amp lang=\"en\">"), `${date} should be an AMP document.`);
  assert(html.includes("<amp-story standalone"), `${date} should be a web story.`);
  assert(!html.includes("Skip to stories") && !html.includes('id="main"'), `${date} should not use the site layout.`);
  assert(html.includes(`href="${escapeHtml(canonical)}"`), `${date} should canonicalise itself.`);
  assert(html.includes(`publisher-logo-src="${escapeHtml(absoluteUrl(SQUARE_LOGO.path))}"`), `${date} needs the square publisher logo.`);
  assert(html.includes(`poster-portrait-src="${escapeHtml(absoluteUrl(edition.posterPath))}"`), `${date} needs the portrait poster.`);
  assert(html.includes('"@type":"NewsArticle"'), `${date} needs NewsArticle structured data.`);
  assert(html.includes(`"name":${JSON.stringify(siteConfig.editor.name)}`), `${date} should credit the editorial team.`);
  assert(!html.includes('"@type":"Person"'), `${date} should not name a person as the author.`);
  const pages = html.match(/<amp-story-page /g) ?? [];
  assert(pages.length === edition.stories.length + 2, `${date} should have a cover, one page per story, and a subscribe page.`);
  assert(html.includes(`>${escapeHtml(READ_CTA)}</a>`), `${date} should link out to the full story.`);
  assert(html.includes(`href="${escapeHtml(absoluteUrl("/subscribe"))}"`), `${date} should link to the newsletter signup.`);
  assert(html.includes(`>${escapeHtml(SUBSCRIBE_CTA)}</a>`), `${date} should offer a subscribe call to action.`);
  for (const story of edition.stories) {
    assert(html.includes(escapeHtml(story.imageCredit)), `${story.slug} should show its photo credit.`);
    assert(html.includes(escapeHtml(story.imageLicense)), `${story.slug} should show its photo license.`);
    assert(html.includes(`href="${escapeHtml(absoluteUrl(`/story/${story.slug}`))}"`), `${story.slug} should link to the article.`);
  }
}

async function validatorInstance() {
  if (!fs.existsSync(VALIDATOR_FILE)) {
    const response = await fetch(VALIDATOR_URL);
    if (!response.ok) {
      throw new Error(`Could not download the AMP validator (${response.status}).`);
    }
    fs.mkdirSync(path.dirname(VALIDATOR_FILE), { recursive: true });
    fs.writeFileSync(VALIDATOR_FILE, await response.text());
  }
  return amphtmlValidator.getInstance(VALIDATOR_FILE);
}

async function assertAmp(htmlFor: { date: string; html: string }[]) {
  const validator = await validatorInstance();
  const failures: string[] = [];
  for (const item of htmlFor) {
    const result = validator.validateString(item.html);
    const errors = result.errors.filter((error) => error.severity === "ERROR");
    if (result.status !== "PASS" || errors.length) {
      const detail = errors
        .slice(0, 8)
        .map((error) => `line ${error.line}: ${error.message}`)
        .join("; ");
      failures.push(`${item.date} ${result.status}: ${detail}`);
    }
  }
  if (failures.length) {
    throw new Error(`AMP validator failed:\n- ${failures.join("\n- ")}`);
  }
}

async function main() {
  const stories = assertSelection();
  const editions = listWebStories(stories);
  assertPosters(editions);
  const rendered = editions.map((edition) => ({
    date: edition.date,
    html: renderWebStoryDocument(edition),
    edition,
  }));
  for (const item of rendered) assertDocument(item.html, item.edition);
  await assertAmp(rendered);
  console.log(`Validated ${rendered.length} web stories with the AMP validator.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
