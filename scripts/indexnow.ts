import { getCategory } from "../lib/categories";
import { indexNowKey, indexNowKeyLocation } from "../lib/indexnow";
import { isWithinHours } from "../lib/seo";
import { getPublishedStories } from "../lib/stories";
import { getStateByCode } from "../lib/states";
import { siteConfig } from "../site.config";

const STATIC_PATHS = ["/", "/sitemap.xml", "/news-sitemap.xml", "/rss.xml", "/atom.xml", "/about", "/editorial-standards", "/corrections", "/contact", "/local"];

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log("IndexNow skipped outside a production deploy.");
    return;
  }

  const urls = new Set(STATIC_PATHS.map((path) => (path === "/" ? siteConfig.url : `${siteConfig.url}${path}`)));
  const recent = getPublishedStories().filter((story) => isWithinHours(story.date, 48));
  for (const story of recent) {
    urls.add(`${siteConfig.url}/story/${story.slug}`);
    const state = getStateByCode(story.state);
    if (state) urls.add(`${siteConfig.url}/state/${state.slug}`);
    if (getCategory(story.category)) urls.add(`${siteConfig.url}/category/${story.category}`);
  }

  const urlList = [...urls];
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteConfig.url).host,
      key: indexNowKey,
      keyLocation: indexNowKeyLocation(),
      urlList,
    }),
  });
  const body = await response.text();
  console.log(`IndexNow ${response.status} for ${urlList.length} URLs`);
  if (!response.ok) console.warn(body.slice(0, 500));
}

main().catch((error: unknown) => {
  console.warn("IndexNow ping failed.");
  console.warn(error instanceof Error ? error.message : error);
});
