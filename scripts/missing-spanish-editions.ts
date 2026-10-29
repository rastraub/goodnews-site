/**
 * Report published weeks that do not have a Spanish Top 5 file yet.
 * Exit 0 when every week is covered. Exit 1 when at least one week is waiting.
 * This does not translate anything and it does not fail `npm run build`.
 */
import { missingSpanishWeeks, suggestSpanishStories } from "../lib/spanish-editions";

const missing = missingSpanishWeeks();

if (!missing.length) {
  console.log("Every published week has a Spanish edition.");
  process.exit(0);
}

console.log(`${missing.length} published ${missing.length === 1 ? "week lacks" : "weeks lack"} a Spanish edition.`);
console.log("Add data/es/buenas-noticias/{monday}.json. See ADDING_STORIES.md.");

for (const week of missing) {
  console.log(`\n${week.start}  ${week.rangeLabel}${week.inProgress ? " (open)" : ""}  ${week.path}`);
  console.log("Suggestions, kid-friendly first, then story of the day, Top 5, and the world pick.");
  console.log("Skip anything violent, political, or upsetting before you translate.");
  for (const story of suggestSpanishStories(week.stories)) {
    const marks = [
      story.kidFriendly ? "kid" : "",
      story.featured ? "featured" : "",
      story.top5 ? `top5:${story.top5}` : "",
      story.worldPick ? "world" : "",
    ].filter(Boolean);
    console.log(`  ${story.slug}  [${marks.join(", ") || "none"}]  ${story.title}`);
  }
}

process.exit(1);
