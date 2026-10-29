/**
 * Print or pin the next Kindness Challenge week.
 *
 *   npm run next-kindness-challenge
 *   npm run next-kindness-challenge -- --write
 *
 * The default prints a JSON stub for the first Monday that is not in
 * data/kindness-challenges.json. Rewrite the sentences so they fit the story
 * before you commit. --write appends the safe fallback stub and will not
 * replace a week that already exists.
 */
import fs from "fs";
import path from "path";
import {
  draftFallbackChallenge,
  kindnessProblems,
  loadCuratedKindnessChallenges,
  nextUncuratedWeek,
} from "../lib/kindness";
import { getPublishedStories } from "../lib/stories";

const file = path.join(process.cwd(), "data", "kindness-challenges.json");

function entryJson(entry: NonNullable<ReturnType<typeof draftFallbackChallenge>>) {
  const { story, ...rest } = entry;
  void story;
  return JSON.stringify(rest, null, 2);
}

function main() {
  const write = process.argv.includes("--write");
  const curated = loadCuratedKindnessChallenges();
  const stories = getPublishedStories();
  const week = nextUncuratedWeek(curated.map((item) => item.week));
  const used = new Set(curated.map((item) => item.storySlug));
  const draft = draftFallbackChallenge(week, stories, used);
  if (!draft) {
    throw new Error("No kid-friendly story is available for a kindness challenge.");
  }
  const problems = kindnessProblems([draft], stories, 0);
  if (problems.length) {
    throw new Error(`Fallback stub is not valid:\n- ${problems.join("\n- ")}`);
  }

  console.log(`Next kindness challenge week: ${week}`);
  console.log(`Fallback story: ${draft.story.slug} — ${draft.story.title}`);
  console.log("");
  console.log("Paste this into data/kindness-challenges.json and rewrite the sentences so they fit that story.");
  console.log("Keep the challenge to one short sentence a child can do for free, with people they already know.");
  console.log("");
  console.log(entryJson(draft));

  if (!write) {
    console.log("");
    console.log("Run with --write to append this stub unchanged. It will not replace a week that is already in the file.");
    return;
  }

  if (curated.some((item) => item.week === week)) {
    console.log(`${week} is already curated. Nothing was written.`);
    return;
  }
  const { story, ...entry } = draft;
  void story;
  const next = { challenges: [...curated, entry] };
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  console.log("");
  console.log(`Appended ${week} to data/kindness-challenges.json.`);
}

main();
