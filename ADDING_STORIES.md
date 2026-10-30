# Adding stories

A story is one Markdown file in `stories/`. A daily job can publish by committing a new file. The next deploy builds it. There is no CMS and no database row.

Check the file before you commit:

```bash
npm run validate-stories
```

`npm run build` runs the same check. Invalid front matter fails the build with the filename and the field that broke.

The schema lives in `lib/story-schema.ts`. It is strict: a typo in a field name is an error, and a published story must set `editorApproved: true`.

## File name

`stories/your-slug.md`

The slug is the filename without `.md`. Use lowercase kebab-case. It becomes the URL `/story/your-slug`.

## Front matter

```yaml
---
title: "A clear, honest headline"
shortTitle: "Shorter line for the Top 5 row"
emphasis: "optional phrase"
dek: "One or two sentences a reader can trust. This is the summary on the card."
date: "2026-10-06"
city: "Akron"
country: "US"
state: "OH"
alsoStates:
  - "ID"
place: "Optional label when one city is not enough"
category: "animals"
sourceName: "Ideastream"
sourceUrl: "https://example.com/the-original-article"
image: "/images/stories/your-photo.webp"
imageAlt: "What the photo actually shows"
imageCaption: "Say if the photo is illustrative and not the subject of the story."
imageCredit: "Photographer / Wikimedia Commons"
imageCreditUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg"
imageLicense: "CC BY 2.0"
imageLicenseUrl: "https://creativecommons.org/licenses/by/2.0/"
imageTreatment: "none"
howToHelp:
  - label: "A real place a reader can act"
    url: "https://example.org/help"
    kind: donate
featured: false
top5: 1
cheers: 0
draft: false
editorApproved: true
correction: "Optional. If set, it shows on the story and the corrections page."
---
```

### Fields

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Honest headline. No clickbait. |
| `shortTitle` | no | Compact line for Today's Top 5. Falls back to `title`. |
| `emphasis` | no | A phrase inside `title` that renders in italic. |
| `dek` | yes | The deck under the headline. |
| `date` | yes | `YYYY-MM-DD`. Quote it so YAML does not surprise you. |
| `city` | yes | Town or city the story is about. Use the same spelling each time (`Denver`, not `denver`). `St. Louis` and `Saint Louis` in the same state are one page. The same name in two states stays two pages. Use `place` when the label is a park, a county, or a region rather than the town. |
| `country` | no | ISO 3166-1 alpha-2 code, uppercase, such as `JP` or `US`. Omit it on a United States story. The default is `US`. |
| `state` | US only | Two-letter USPS code, including `DC`. Required when `country` is `US` or omitted. Leave it off for every other country. |
| `alsoStates` | no | Other US states this story should appear in. Do not repeat `state`. Leave it off outside the United States. |
| `place` | no | Overrides the default "City, State" or "City, Country" label. |
| `category` | yes | `heroes`, `animals`, `science`, `community`, or `health-tech`. |
| `tags` | yes on a new story | Two to five labels from `lib/tags.ts`, such as `animal-rescue` or `school-lunch`. A topic page is created only after at least three stories share that tag. Validation rejects a tag that is not in the vocabulary, and it rejects a list that is not two to five labels. Omitting `tags` entirely still builds, so a file that lands on `main` before it is tagged does not take the site down. Do not rely on that. Set the tags. |
| `sourceName` | yes | The newsroom that reported it. |
| `sourceUrl` | yes | `https` link to the original article. Use the URL exactly. |
| `image` | yes | WebP path under `public`, for example `/images/stories/pony.webp`. Also add `pony-sm.webp`, about 360px wide, for thumbnails. A `pony-1600.jpg` is optional. When you replace a photo, use a new name such as `pony-v2.webp`. See Photos. |
| `imageAlt` | yes | Describe the actual photo. |
| `imageCaption` | yes | Shown under the photo. Say when it is not the real subject. |
| `imageCredit` | yes | Photographer and source. |
| `imageCreditUrl` | yes | Page for the photo. |
| `imageLicense` | yes | Short license name. |
| `imageLicenseUrl` | yes | Link to the license. |
| `imageTreatment` | no | `none` (default) or `warm` (a light sepia, used for diner photos). |
| `howToHelp` | yes | At least one link. `kind` is `donate`, `volunteer`, `thank`, or `learn`. |
| `featured` | no | `true` makes it eligible to be the story of the day. The newest featured story wins. |
| `top5` | no | Rank `1` through `5`. Each number can be used once. |
| `worldPick` | no | `true` on one story from outside the United States. That story is the bonus "Around the World" link in the morning email, and the spotlight on the homepage and state pages. Leave it off US stories. Only one story may have it. |
| `kidFriendly` | no | `true` only when a teacher can read the story aloud with children about ages 6 to 12. Requires `kidSummary` and `kidQuestions`. Defaults to false. Leave it off stories centered on death, serious illness, violence, crime, accidents with injuries, abuse, war, or addiction. |
| `kidSummary` | with `kidFriendly` | About 60 to 110 words in plain language, accurate to the story and its source. No invented facts or quotes. A teacher should be able to read it aloud. Leave it off when `kidFriendly` is false. |
| `kidQuestions` | with `kidFriendly` | Two or three discussion questions: feelings, kindness, how a class could help, or a simple science or geography question. Leave them off otherwise. The Friday pack prints the first two. |
| `kidWord` | no | One vocabulary word already in the story, for the Friday pack. Requires `kidDefinition` and `kidFriendly`. Leave it off when you do not have a definition taken from the story. Do not invent one. |
| `kidDefinition` | with `kidWord` | A short definition a teacher can read to ages 6 to 11. It has to match the word as the story uses it. Leave it off otherwise. |
| `cheers` | no | Starting cheer count. Defaults to 0. Readers add one in their own browser. |
| `draft` | no | `true` keeps it out of the site. It is still validated. |
| `editorApproved` | yes | Must be `true` for anything that is not a draft. This is the publish switch. |
| `correction` | no | Public correction. It appears on the story and on `/corrections`. Feeds and article markup then use a modified time 12 hours after that story's publish time. The file has a date, not a clock time. |
| `updates` | no | Follow-ups on this same URL. Leave it off when there is nothing new. See Follow-ups below. |

The body under the front matter is the original summary. Write it yourself. Do not paste the source article. Aim for a short, sourced account, at least 40 words. Paragraphs separated by a blank line. Links look like `[label](https://example.com)`.

## Follow-ups

A follow-up is original reporting on a story that is already published: what happened next, or where things stand now. Edit the existing file. Do not add a second story, and do not change the filename. The public URL stays `/story/your-slug`.

Leave `updates` off until you have a checked note. Do not invent a follow-up, a source, or a help link to fill the page. `/follow-ups` is an intentional empty state until the first real note lands.

Add the field to the story's front matter:

```yaml
updates:
  - date: "2026-11-04"
    text: "A short original note on what happened next. Checked against a source. Do not paste the other outlet's article."
    sourceName: "Ideastream"
    sourceUrl: "https://example.com/the-follow-up"
    howToHelp:
      - label: "A real place a reader can act now"
        url: "https://example.org/help-now"
        kind: donate
```

| Field | Required | Notes |
| --- | --- | --- |
| `date` | yes | `YYYY-MM-DD`, quoted. On or after the story `date`. One note per date. The story `date` stays the publication date. |
| `text` | yes | Your own note, 40 to 800 characters. It shows as `Update, Nov 4, 2026` near the top of the story, after the summary. |
| `sourceName` | no | The outlet or page you checked. Set it only together with `sourceUrl`. |
| `sourceUrl` | no | `https` link for that source. Omit both fields when the note has no separate source. |
| `howToHelp` | no | The way to help **now**. Same shape as the story's `howToHelp`: `label`, `url` (`https`), and `kind` (`donate`, `volunteer`, `thank`, or `learn`). At most six links. |

`howToHelp` on a follow-up replaces the sidebar until a newer follow-up sets its own list. A later note that omits `howToHelp` leaves the previous follow-up's links in place. To go back to the original story links, repeat that original list on the new note. Omit `howToHelp` when the way to help has not changed.

The newest follow-up sets `dateModified` in the article markup and the story's sitemap date. The publish date does not move, and the news sitemap still uses the original publication time. A follow-up on a later day is 09:00 UTC that day. A follow-up on the story's own date has no clock, so it is 12 hours after that story's publish time, the same offset as a correction.

`/follow-ups` lists every story that has a note, newest first, and links each one back to `/story/your-slug`. The footer links there. `/follow-ups/rss.xml` is one item per note, and each item's link is the original story URL. A reader who has an update uses the existing form at `/submit`.

Run `npm run validate-stories` after the edit. A date before the story, a duplicate date, a source with only one of the two fields, or an `http` link fails the build.

## Stories outside the United States

Use the same verification bar as a domestic story. The source is a reputable local newsroom or an international desk, the URL is `https`, and the summary is checked against that report. Do not lower the bar to fill a country page.

```yaml
city: "Osaka"
country: "JP"
```

- Set `country` to the uppercase ISO code. `jp` and `Japan` both fail.
- Omit `state` and `alsoStates`. A state code on a non-US story fails validation.
- `city` is still required. Use `place` when one city is the wrong label.
- The story appears at `/country/japan` (the code redirects to the name slug), in `/world`, in the main RSS and news sitemap, and in `/country/japan/rss.xml`. It does not appear on a US state page.
- Existing US files can keep omitting `country`. They stay `US` and keep `state`.
- `worldPick: true` marks the one international story for the day. See the daily job below.

### Pages that appear on their own

State topic pages and tag pages are created only when at least three published stories belong there. A thinner combination is not a page, so it is not in the sitemap and it does not rank. City pages are the exception: every city in the archive gets a page.

- `/state/colorado/animals` is that state's stories in one category. It needs three stories.
- `/state/colorado/city/denver` is one US city. The page exists as soon as one story names that city. It is indexable, listed in the sitemap, and included in the IndexNow ping once the city has two stories. A city with one story still renders and is linked from the state page, but the page is noindex and left out of the sitemap.
- City names are normalized. Case, punctuation, and the abbreviations `St.`, `Ft.`, and `Mt.` share one URL. `St. Louis` and `Saint Louis` in Missouri are `/state/missouri/city/saint-louis`. `Fort Worth` and `Ft. Worth` are `/state/texas/city/fort-worth`. Springfield in Illinois and Springfield in Missouri stay different pages because the state is part of the URL. The intro on the page is counted from the stories: how many, the date range, and the top categories. It does not add facts about the city that are not in the archive.
- `/country/japan/city/osaka` follows the same city rule outside the United States. Those pages are linked from the country page.
- `/topic/animal-rescue` is a tag shared by at least three stories. The index of those pages is `/topics`.

A country page with fewer than three stories stays linked from the world index, but it is left out of the sitemap and marked noindex. State pages themselves stay up even when a state has only one story. Pick tags from `lib/tags.ts`. Do not invent a tag to force a page. If a real topic is missing from that list, add the slug, a human title such as "Good news about animal rescue", and a one-sentence intro there first. Validation rejects anything else. Indexable city hubs, state topic hubs, and topic hubs are in the sitemap and in the IndexNow ping. One-story city pages are not.

`npm run city-report` lists every city by story count, marked index or noindex. `npm run validate-stories` prints the same report.

### Stories for classrooms

Use these fields only when the story is genuinely appropriate to read aloud with children about ages 6 to 12: animals, nature, science, kindness, kids doing something great, community help, sports spirit. Skip stories centered on death, serious illness or cancer, violence, crime, accidents with injuries, abuse, war, addiction, or anything a teacher would hesitate to read to a class, even if the ending is happy. Do not force a kid-friendly version of a story that is not one. Expect some stories in a batch to qualify and some not to. Do not hit a quota.

```yaml
kidFriendly: true
kidSummary: "About 60 to 110 words in plain language, accurate to the report, with no invented facts."
kidQuestions:
  - "What did the people in this story do?"
  - "What is one kind thing your class could try?"
```

- `kidFriendly: true` without a summary and two or three questions fails validation. A summary or questions without the flag also fails, so the classroom text cannot be dropped by accident.
- `kidSummary` is a read-aloud version, not a shorter headline. Use plain words. Stay accurate to the story and its source. Do not invent facts, numbers, or quotes.
- `kidQuestions` should spark a discussion: a feeling, an act of kindness, how the class might help, or a simple science or geography question tied to the story.
- `/kids` lists every published classroom story. `/kids/print` is the printable story of the day for teachers. It rotates by calendar date. A classroom story dated that day is the one that prints. If that date has none, a recent classroom story is used so the sheet is not blank.
- `/classroom` lists Good News Friday packs, newest first. `/classroom/week/2026-10-19` is one pack. The date is the Monday of that week, the same key as `/week`. The pack is what a class prints on Friday. It is built from that week's classroom stories: up to five, with a world story when the week has one, and a mix of categories and places. It prints the photo, `kidSummary`, the first two `kidQuestions`, and the place. A vocabulary line prints only when `kidWord` and `kidDefinition` are both set. The page does not invent a summary, a word, or a fact to fill a short week.
- `/kids/state/colorado` and `/kids/country/japan` exist only when that place has at least one classroom story. A state and a country can share a name, so the path says which is which. An empty place is not a page.
- The teacher email is a separate signup on `/kids` for adults and educators. The list tag is `teachers`. Do not collect a child's name, age, school, or email. Classroom pages do not run ads.
- A published story is also eligible for that week's Good News Quiz. Set `kidFriendly: true` when a teacher could use it in kid mode. See [docs/good-news-quiz.md](docs/good-news-quiz.md).

### Listening

Story pages can read the headline, the dek, and the body aloud in the browser. The control uses the device's built-in speech. There is no audio file to add, and nothing is sent to a speech service. When a story has `kidSummary`, the page also offers a Kid version that reads the headline and that summary instead of the dek and the full body. Classroom pages (`/kids`, a state or country classroom page, the printable story of the day, and each week's classroom section) can read the listed kid summaries in order. If the browser cannot speak, the buttons are left off the page. A reader's speed and voice stay in their own browser.

### Mix for a daily batch

About one in four stories in a daily batch should come from outside the United States when the batch is large enough and the reporting is strong enough. Spread those stories across more than one region. Do not force a weak story to hit the mix, and do not fill the international share from a single country. Stories from the United States stay the majority while the world edition is growing.

## Photos

Store images in `public/images/stories/` as WebP. Each story needs the full photo (`pony.webp`, about 840px wide) and a thumbnail (`pony-sm.webp`, about 360px wide). Do not upscale a smaller photo to invent the larger size.

Browsers and the CDN keep `/images` for 30 days, so overwriting `pony.webp` does not change what readers see. A replacement gets the next version in the filename: `pony-v2.webp`, `pony-v2-sm.webp`, and `pony-v2-1600.jpg`. Set `image` to the new WebP. The thumbnail and the large JPEG are that same path with `.webp` swapped for `-sm.webp` and `-1600.jpg`, which means the version stays in the stem, ahead of the extension. The one after that is `pony-v3`. Do not reuse the old filename.

Listing pages are paginated and cards use the thumbnail through `srcSet`, so a large archive does not request every full photo at once. Use photos you have the right to use, credit them, and do not present a stranger's face as the person in the story. A caption should say when a photo is illustrative.

The photo has to evoke the story's emotion and its subject. Prefer people, animals, or action. Do not use a generic empty building, an empty gym, an empty classroom, an empty pool, a vacant playground, a vacant street, or a plain exterior for a story about a person, an animal, or something that happened. Prefer a relevant scene over a literal picture of the town, the campus, or the building where it took place. A pep rally should look like a crowd celebrating, not an empty gym in another state. A swim lesson should show people in the water, not a pool under construction. A mural should show the art or someone painting, not a highway. A trail story should show a hiker or the woods, not a sign by itself. Skip product shots on a white background, parked vehicles with nobody in them, and generic signage. If the photo is not the actual scene, the caption has to include the words "Illustrative photo". Do not use a copyrighted news photo of the real people, and do not use a photo with an identifiable child's face.

Feeds, `og:image`, and the NewsArticle image prefer a sibling JPEG, `pony-1600.jpg` (about 1600px wide, 16:9 or 4:3, roughly 200 to 400 KB). The morning job does not have to create it. If the file is missing, the build still passes and those slots use the WebP.

When you want the JPEG, run:

```bash
npm run feed-images
```

The script reads `imageCreditUrl`. It downloads a larger copy only from Wikimedia Commons, of the same file the story already credits. It keeps that credit and license, writes them into the JPEG, and skips a photo that cannot reach 1200px wide without stretching by more than 15 percent. It does not replace the WebP used on the page, and it does not pick a different photo.

## What the daily job does

A morning batch is new story files. Verify each one, then rotate the homepage so the freshest news is what people see first.

1. Open the source article and confirm the URL, the date, and the facts you plan to summarize. Reputable newsrooms only, including a reputable desk outside the United States. Skip politics, tragedy-with-a-silver-lining framing, and anything already in `stories/`. For `health-tech`, also follow the rules in the next section. Aim for the mix in "Stories outside the United States": about one in four of a large batch from outside the United States, across more than one region, and only when the reporting is strong enough.
2. Add `stories/some-new-slug.md`, the full WebP, and the `-sm` thumbnail. Choose the photo with the rule in Photos: it has to evoke the story's emotion and subject (people, animals, or action), not a generic empty building, and a relevant scene is better than a literal location. Write an original summary of at least 40 words. Do not paste the article. Set `tags` to two, three, four, or five slugs from `lib/tags.ts`. Read that file and reuse a label people already search. Do not coin a near-duplicate (`dog` next to `dogs`) or a tag that only this story would ever use. If the story truly needs a new label, add it to `lib/tags.ts` with a title and intro before you tag the story. Put the tags in the new story's front matter. Do not add them to `data/story-enrichment.json`. That file is the backfill for stories published before tags existed. Front matter wins if both places set tags, which is why new stories should carry their own.
3. Set `cheers: 0` on every new story. Do not invent a cheer count.
4. Set `editorApproved: true` and `draft: false` only after that check. Until then, keep `draft: true`.
5. Rotate the homepage. Ranks live in front matter. Each `top5` number can be used only once.
   - **Featured.** The hero is the newest story with `featured: true` (newest date wins). Set `featured: true` on the single best story of the day, and set `featured: false` on every other story, including older ones. If an older story is left featured and no newer story is featured, it keeps the hero spot.
   - **Top 5.** Assign ranks `1` through `5` to the five strongest newest stories. Remove `top5` from any story that is leaving that five. If the morning batch has fewer than five stories, fill the remaining ranks from the strongest recent stories already on the site, still using each rank once.
   - **Around the World.** Set `worldPick: true` on one story from outside the United States, and remove `worldPick` from yesterday's pick. Only one story may have it. A US story cannot have it. The morning email is sent outside this repo. After the Top 5, add a bonus link titled "Around the World": the headline, the place, and the story URL. `worldSpotlight()` in `lib/world-pick.ts` returns that story. If the flag is missing and an international story exists, the same helper rotates a recent one by calendar date, and the homepage and state pages use that rotation. Use the flag when you have a story worth the email. Do not invent one to fill the slot.
   - **For classrooms.** When a story is appropriate to read aloud with children about ages 6 to 12, set `kidFriendly: true` in that story's front matter, write `kidSummary` in about 60 to 110 plain words, and add two or three `kidQuestions`. Stay accurate to the source. Do not invent facts or quotes. Skip the flag for death, serious illness or cancer, violence, crime, accidents with injuries, abuse, war, addiction, and anything a teacher would hesitate to read to a class. Do not force one into the batch. Do not backfill classroom text into `data/story-enrichment.json`. The kids pages, `/kids/print`, and the Good News Friday pack use these fields. Add `kidWord` and `kidDefinition` only when both come from the story. Do not invent a vocabulary word to fill the pack. `storyOfTheDay()` in `lib/kids.ts` picks the printable story. The Friday pack rebuilds from the week's classroom stories at `/classroom/week/{Monday}`. Do not hand-write a pack. The teacher email is a separate adult list. Do not add a child to any list, and do not add ads or anything else that identifies a child.
6. Run `npm run validate-stories` and `npm run build`. Both have to pass. Validation prints the city coverage report (the same list as `npm run city-report`): which cities have a page, and which of those pages are indexable. The build prebuilds story, listing, and hub HTML, including one-story city pages, and it rebuilds the Good News Index from those story files, including the open month. If the archive outgrows that cap, validation fails on purpose: do not leave the extra pages to render on each request. The same build publishes that day's web story. If next Monday is missing from the Kindness Challenge file, add it before you build. See Weekly Kindness Challenge below. There is no extra file to add. Explainers are a separate folder. Do not paste an explainer into a story. If the story is about a topic that already has one, the story page links it. See Good News Explainers below.
7. Commit the new stories, the images, and the rank edits, then push to `main`. The next deploy publishes them.
8. While the Thanksgiving hub is open, run `npm run thanks-gaps` and aim a real kindness or gratitude story at a state that is still missing. Do not force a weak story just to close a gap. See 50 States of Thanks below.

## 50 States of Thanks

`/50-states-of-thanks` is the Thanksgiving hub for 2026. It picks one published United States story for each state and Washington, D.C. The pick prefers gratitude, kindness, neighbors, giving back, community, veterans, and thank-you moments, and it prefers a recent people-centered story when two of them fit. A state with nothing that fits shows a link to `/submit` instead of an empty card. The page is rebuilt with the rest of the site, so a morning batch fills a gap on the next deploy. It is in the sitemap and in the IndexNow ping.

Editors can pin a story in `data/thanks-overrides.json`. Leave the file as `{}` to keep the automatic picks. A pin is the story slug. The story has to be published and filed in that state (`state` or `alsoStates`):

```json
{
  "DE": "dover-veterans-home"
}
```

A bad code, or a slug that is not filed in that state, fails `npm run validate-stories` and the build.

The homepage banner runs from November 1 through November 30, 2026. The date is America/Denver, the same clock as the morning edition. It is a single line so the Story of the Day headline stays put. Set `thanksSeason.banner` to `false` in `lib/thanks.ts` to hide the banner sooner. The footer link and the link on `/local` stay, so the page is still easy to find after the banner comes down.

To see which states are still open:

```bash
npm run thanks-gaps
```

## Good News Index

The monthly index is built from published story files. Do not hand-edit ranks or totals.

- The first edition is October 2026. A story dated before that month stays in the archive and is not an edition.
- The open month is labeled month to date until the month is over. The updated-through date is the newest story date in that edition.
- A United States story counts once in the national total, and it also counts in its state and in each `alsoStates` code. Adding the state rows can come out higher than the United States total.
- Each edition is `/good-news-index/YYYY-MM`. The spreadsheet is `/good-news-index/YYYY-MM/index.csv`.
- Stories per 1 million residents use the July 1, 2024 resident population in `lib/population.ts` (`NST-EST2024-POP`). Replacing that table changes every closed edition, so do it only on purpose.
- The index counts stories this site published. It is not a measure of how good a state is.

## Credited newsrooms

Published stories name the original newsroom in `sourceName` and link the article in `sourceUrl`. The public thank-you list is `/sources`. A newsroom with at least two credited stories also has `/sources/{slug}`. A newsroom with one story stays on `/sources` and does not get its own page.

The same site is one newsroom when the source URLs share a domain (a leading `www.` does not count as a different site). Names that differ only by case or spacing are the same newsroom. A trailing `News` is the same newsroom only when the domain matches, so "ABC" and "ABC News" on one site fold together, and the same words on two sites stay apart. Different names on one domain, such as two stations that publish on a shared site, stay separate.

For outreach notes, print a CSV of every credited newsroom:

```bash
npm run credited-outlets-report
npm run credited-outlets-report -- outlets.csv
```

With no path, the CSV goes to standard output. A path writes that file. Prefer a path when you want a clean file, because `npm run` also prints the command it is running. Drafts are skipped. Columns are `outlet`, `domain`, `homepage`, `states`, `story_count`, `latest_date`, `story_urls`, and `nonprofits`. `states` lists US state names and, for a story outside the United States, the country name. `story_urls` are the summaries on this site. `nonprofits` are the `howToHelp` labels and links on those stories. The row order matches `/sources`: most stories first.

## Web story

Every date that has a published story gets an AMP web story at `/web-stories/YYYY-MM-DD`. The index is `/web-stories`. The morning job does not create a file for it, and it does not crop a poster by hand.

The build reads the stories filed on that date and keeps up to five:

- When any of those stories has a `top5` rank, the order matches the daily Top 5: ranked stories first, then the rest of that date.
- When none of them has a rank, the featured story comes first and the newest stories follow. Stories that share a date already sort by title after the featured flag, which is the same order the rest of the site uses.

The cover says "Today's good news" and the date. Each story page uses that story's photo, the short title, a one-line dek, the place, and the photo credit and license. "Read the story" opens the full article. The last page links to `/subscribe`.

`npm run build` crops a 3:4 poster from the lead photo with sharp, writes it under `public/images/web-stories/`, and runs the AMP validator. Those posters are build output. A new story file on `main` is enough.

## Giving Tuesday

`/giving-tuesday` is an evergreen guide: one featured way to help for each state and the District of Columbia. The title is "50 states, 50 ways to help." The page stays up after the day itself. A homepage banner appears only from November 24 through December 2, 2026, and then it comes down. The URL does not change.

The guide does not add organizations, links, or claims. Every card is a `howToHelp` entry already on a published United States story, plus that story's summary, city, photo, and source. The story's own `state` is the state that counts. `alsoStates` does not fill a second state.

### How a state is filled

For each state, the build ranks that state's how-to-help links. A donate, volunteer, or thank-you link outranks a learn-more link. A link whose site appears in only one state outranks a site that shows up in several states. When two links are close, the picker spreads causes so one theme does not take every card. The cause labels are animals, kids, veterans, food, housing, disaster relief, and environment, and they come from the story's tags. A story in the animals section counts as animals even without a matching tag. Disaster relief is used only when the title, the summary, or the help label already says disaster relief, hurricane relief, wildfire relief, tornado relief, flood relief, or earthquake relief. Anything else stays in More.

A card is marked "Costs nothing" only when that link's own data says so: the kind is volunteer or thank, the label asks the reader to volunteer, the label asks the reader to donate goods (food, coats, shoes, and the same kind of item), or the label starts with "Share". A gift of money is not marked that way.

A state with no published story gets a gap card that links to `/submit`. Publishing a story there fills the card on the next deploy.

### Pin a state

Edit `lib/giving-tuesday-pins.ts` when a particular story should represent a state.

```ts
export const GIVING_TUESDAY_PINS = [
  { state: "CO", slug: "the-story-slug" },
  { state: "ME", slug: "another-story-slug", url: "https://example.org/the-exact-help-link" },
];
```

`state` is the USPS code, including `DC`. `slug` is the filename without `.md`. The story must be published, in the United States, and its `state` must match the pin. `url` is optional. When you set it, copy it from that story's `howToHelp` list. The match is exact. When you omit it, the guide uses the strongest how-to-help link on that story. An empty list leaves every state on the automatic pick. A pin that does not match a real story fails `npm run validate-stories`.

### Coverage

```bash
npm run giving-tuesday-coverage
```

The script prints how many states have a pick and lists any state that does not. It does not fail the build.

## Veterans Day hub

`/veterans-day` stays up all year. It shows one kindness story about veterans for each state and Washington, D.C., chosen from stories already in the archive. November 11 does not turn the page off.

A story qualifies when it has the `veterans` tag, or when the headline or deck says veteran or honor flight. A sports “veteran” (NBA, NFL, and the other leagues) does not qualify unless the tag is set. A passing mention in the body is not enough.

The automatic pick prefers a story filed in that state over one that only lists the state in `alsoStates`. After that it takes the newest date, then `featured`, then a Top 5 rank, then a stronger veteran headline (honor flight, housing, a service dog, a medal). A state with no match shows an open card that links to `/submit`.

To replace the pick for one state, edit `data/veterans-day-pins.json`. Keys are USPS codes, including `DC`. Values are story slugs. Leave a state out to keep the automatic pick. An empty object means every state is automatic.

```json
{
  "VA": "altavista-valor-farm"
}
```

The pinned story has to be published, has to qualify, and has to be filed in that state (`state` or `alsoStates`). A bad pin fails `npm run validate-stories` and the build. The card says “Pinned” when a pin is in use. The byline on the page stays the public masthead from `site.config.ts`.

`npm run veterans-gaps` prints the states that still need a veteran story, plus the slug chosen for each covered state. The same open list is logged by `npm run validate-stories`. Open states do not fail the build. The daily run can use that list to fill the gaps.

The page is in the sitemap. A production deploy pings it through IndexNow with the other static pages. The homepage shows a banner from November 1 through November 12, using the same New York date as the edition line, and only after a build during that window. The hub URL itself does not change.

## First Responders Day hub

`/first-responders-day` stays up all year. The page shows October 28 of the current edition year, so the URL does not change. The byline is `siteConfig.editor.name`. Do not put a personal name on this page.

The hub is built from stories already in the archive. A story is eligible when it is tagged `first-responders`, or when it carries a role tag (`firefighters`, `police`, `ems`, `dispatch`, `search-and-rescue`). Drafts stay off.

### What stays off the page

Two filters run, and both have to pass.

The keyword filter reads the title, deck, and body. A match rejects the story. The phrases are:

- use of force, use-of-force, used force, excessive force, brutality, taser, pepper spray, officer-involved
- shooting, gunfire, gunshot, shot and killed, opened fire
- police pursuit, high-speed chase, car chase, police chase, pursued
- suspect, arrested, under arrest, taken into custody, charged with, indicted, indictment, convicted
- politics, political, partisan, campaign rally, on the ballot, election night

`cardiac arrest` and `discharged` do not match. `suspected` does not match `suspect`. The list lives in `EXCLUSION_RULES` in `lib/first-responders-day.ts`.

An automatic pick also has to read as a rescue, lifesaving help, a reunion, or a kindness or community moment. A budget item or a meeting agenda does not qualify even with the tag.

The editor exclude list is `exclude` in `data/first-responders-day.json`. Those slugs are left off even when they would otherwise qualify. A slug that is not a published story fails `npm run validate-stories` and the build.

A story about a shooting, a pursuit, a suspect, use of force, or politics cannot be pinned back on. A pin can keep a real first-responder story that the positive-phrase check would skip.

### How a story is chosen

Role groups are Firefighters, Police and deputies, EMS and flight crews, Dispatchers, and Search and rescue. A role tag wins. Otherwise the title and deck are scanned for the job. A passing mention in the body does not file the story, and "until firefighters arrived" does not make a neighbor's rescue a firefighter story. Each group shows up to six stories, best score first: a rescue or lifesaving act, then a reunion, then kindness. Pins from `roles` in the JSON file stay at the front and do not also appear in an automatic group. A group with no story shows an open card that links to `/submit`.

The state section uses the shared one-story picker in `lib/state-story-hub.ts`. Home state wins, then the rescue and kindness score, then the newest date, then `featured`, then a Top 5 rank. A state with no match shows an open card linking to `/submit`. One story can fill a state it lists in `alsoStates` when that state has nothing of its own.

To replace a state card, set `states` in `data/first-responders-day.json`. Keys are USPS codes, including `DC`. Values are story slugs. Leave a state out to keep the automatic pick.

```json
{
  "exclude": ["orlando-banana-hero"],
  "states": { "OH": "dayton-officer-mote" },
  "roles": {
    "fire": [],
    "police": ["dayton-officer-mote"],
    "ems": [],
    "dispatch": [],
    "search-and-rescue": []
  }
}
```

The pinned story has to be published, filed in that state (`state` or `alsoStates`), and clear the content filter. A bad pin or a bad exclude slug fails the build. The card says "Pinned" when a pin is in use.

`npm run first-responders-gaps` prints each role group and the states that are still open. The same open list is logged by `npm run validate-stories`. Open states do not fail the build.

The page is in the sitemap. A production deploy pings it through IndexNow with the other static pages. The homepage shows a banner from October 21 through October 29, using the same New York date as the edition line, every year, and only after a build during that window. `/topic/first-responders` links here all year. The hub URL itself does not change.
## Weekly Kindness Challenge

One page per Monday, at `/kindness-challenge` and `/kindness-challenge/YYYY-MM-DD`. The date is the Monday of that week, from the same helper as `/week`: `weekStart()` in `lib/weeks.ts`. The first page is the Monday of the launch week.

Curated challenges live in `data/kindness-challenges.json`. Each entry needs:

| Field | What to write |
| --- | --- |
| `week` | A Monday, `YYYY-MM-DD`. |
| `storySlug` | A published story with `kidFriendly: true`. The build rejects a slug that is missing, still a draft, or not marked for classrooms. |
| `challenge` | One short sentence. Free, safe, and something a child can do with people they already know. A thank-you note to a school custodian is the right size. Do not ask a child to knock on a stranger's door, to spend money, or to go anywhere alone. |
| `why` | One or two kid-friendly sentences tied to that story. Do not invent facts. |
| `school`, `home`, `neighborhood` | One easy way for each place. The neighborhood step stays with a grown-up the child lives with. |
| `teacherNote` | How a teacher runs it. Say not to collect a child's name, age, school, or email. |
| `shareText` | Spoiler-free. Describe the action, not the twist of the news story, and do not paste the story headline. |

`npm run validate-stories` and `npm run build` both check that every `storySlug` exists. The pages, the sitemap, and the IndexNow ping use the same list.

### What the daily run adds

After the new stories are in, see whether the next Monday needs an entry:

```bash
npm run next-kindness-challenge
```

The script prints the first Monday from launch that is not in the file. When the weeks already on the site are full, that Monday is the one after the published window, so you can prepare it before it goes live. Paste the JSON into `challenges` in `data/kindness-challenges.json`, then rewrite the sentences in your own words so they fit the story. Prefer a new `kidFriendly` story from the batch when one is a real fit. Otherwise use an older classroom story tagged `kindness`. Run the script again to confirm that Monday is no longer listed.

To pin the safe fallback without a rewrite:

```bash
npm run next-kindness-challenge -- --write
```

`--write` appends one entry. It does not replace a week that is already in the file. A rewritten entry is better. The stub is only there so a missed morning does not leave a hole.

### Fallback

If a Monday inside the published window has no curated entry, the page still builds. `pickFallbackStory()` in `lib/kindness.ts` chooses a published `kidFriendly` story tagged `kindness`, skipping stories already used by curated weeks when another one is free. If no classroom story has that tag, it uses any `kidFriendly` story. The action on that page comes from a fixed set of safe prompts. It does not invent details from the story. The window runs from launch week through eight Mondays after the current week.

Check the page before you commit. The challenge has to stay positive, and a teacher should be able to hand it to children about ages 6 to 12.
## Spanish weekly Top 5

8. Spanish edition. Do not translate a story inside the morning job, and do not call a translation API. Once a week, follow the next section. `npm run missing-spanish` lists weeks that do not have a Spanish file yet.

## Spanish weekly edition

`/es/buenas-noticias/{monday}` is five stories from that Monday-to-Sunday week, in Spanish, for families and classrooms. The date is the same Monday the English page uses at `/week/{monday}`. `/es/buenas-noticias` lists the editions. `/es` points there. The feed is `/es/rss.xml`.

The words live in a JSON file, one edition per week:

`data/es/buenas-noticias/2026-10-05.json`

```json
{
  "start": "2026-10-05",
  "stories": [
    {
      "slug": "ottawa-book-brigade",
      "headline": "Un titular en español",
      "summary": "Dos a cuatro oraciones. Los nombres, lugares y números salen de la nota en inglés.",
      "kidLine": "Una línea para leer en clase, solo si la historia ya tiene kidFriendly."
    }
  ]
}
```

The file needs exactly five stories. `headline` is the Spanish title. `summary` is two to four sentences. `kidLine` is one or two sentences, and only when that story already has `kidFriendly: true`. Leave it off otherwise. Do not put the source name in the file. The page reads `sourceName` and `sourceUrl` from the English story so the credit cannot drift. The city and state (or country) are read from the story too.

The page adds this note on its own, with the publication name from `site.config.ts`. Do not put a person's name in the file, the headline, or the summary as translator or editor:

> Resúmenes traducidos del inglés por el equipo de {name}. Las fuentes originales están en inglés.

### What the weekly run does

1. Run `npm run missing-spanish`. It prints each published week that has no Spanish file, and up to eight suggestions. A non-zero exit means a week is waiting. The build does not fail for that gap, so a morning story batch can still ship.
2. Pick five stories from that week. Order the suggestions the way the script does: kid-friendly first, then a story still marked `featured` (the story of the day), then `top5` from 1 to 5, then `worldPick`, then the most-cheered, then the newest. Homepage marks usually live on the current day only, so an older week often has kid-friendly as the durable signal. Drop anything violent, political, or upsetting, even when the ending is happy and even when `kidFriendly` is set. Do not force a quota of countries. If the top of the list is five versions of the same news, swap in the next suitable story.
3. Read the English story and its source. Write the headline and summary in neutral Latin American Spanish that a parent can read with a child. Keep names, places, and numbers as they are. Do not add a fact, a quote, or a happier ending. Do not call a paid translation API. The file is the translation.
4. The open week can be published before Sunday. The page says "hasta ahora" until that Monday rolls over, using the same Mountain Time week as `/week`. If a stronger suitable story is published later in the week, edit the same JSON file. The feed includes an edition as soon as the file exists, including the open week, because the file does not grow by itself.
5. Run `npm run validate-stories` and `npm run build`. Validation checks the Monday, the five slugs, the sentence counts, the kid line, and the feed. Commit the JSON file with the week's stories. The next deploy adds the page, the sitemap entry, and the IndexNow URL.


## Health & Tech

`health-tech` is displayed as "Health & Tech". It is for medical advances, longevity research with real human results, and technology that is already helping people. The bar is stricter than the other categories.

- Publish a result that is already helping people, or that a human trial has shown. A single mouse or cell study is out. So is a "could someday" claim, an IND clearance, a first dose whose safety and benefit are not yet known, or a trial that has not started.
- The source has to be highly respected: a major newsroom, a peer-reviewed journal, a university, or a public-health authority such as the NIH, FDA, or CDC. A company press release is not enough on its own.
- Skip a story that is essentially marketing for a product, a supplement, or a clinic. Skip anti-aging miracle claims.
- The summary has to say plainly what was shown and where the evidence stops. If survival was not measured, say so. If follow-up is short, or only a few patients have had the next step, say so.

## Good News Explainers

Explainers are evergreen guides, not news stories. They live in `explainers/`, one Markdown file per page. The filename is the slug. `explainers/how-honor-flights-work.md` becomes `/explainers/how-honor-flights-work`. The index is `/explainers`.

They are not in the RSS feeds or the news sitemap. They are in the main sitemap, and a production deploy includes them in the IndexNow ping. The byline is always the editorial team from `site.config.ts`. Do not put a person's name on an explainer.

```yaml
---
title: "How a community fridge works"
shortTitle: "Community fridges"
dek: "One or two sentences that say what the page explains."
date: "2026-10-24"
schema: Article
tags:
  - food-banks
  - food-rescue
keywords:
  - community fridge
kidSummary: "A short read-aloud version, about 60 to 110 words, with no invented facts."
safety:
  - "A practical caution a reader should see before they try this."
  - "Another caution. Two to six notes."
howToHelp:
  - label: "A national organization's real page"
    url: "https://example.org/help"
    kind: learn
sources:
  - label: "The page a fact in the body came from"
    url: "https://example.org/source"
draft: false
---
```

Use `schema: HowTo` only when the page is a real sequence of steps, and then add `steps` with a `name` and a `text` for each one. The page renders those steps and the HowTo structured data. A page that explains how something works, without a sequence a reader performs, stays `schema: Article` and does not get `steps`.

`howToHelp` uses the same `kind` values as a story: `donate`, `volunteer`, `thank`, or `learn`. Link only official sites of well-known national organizations, or a government page. Do not invent a local URL. Do not invent statistics. If you state a fact, link the source in the body and list that same URL under `sources`. Every `https` link in the body has to be in `sources` or `howToHelp`. Links to other explainers use a site path such as `/explainers/how-food-banks-rescue-food`.

The body is original prose under the front matter, at least 220 words, with `##` sections such as "What it is", "How it works", and "How to help". Write it in plain language. The safety notes and the kid summary are not part of that word count. They render in their own blocks.

### How archive linking works

A published story shows up in "Stories from the archive", and the story page shows "Learn how this works", when the story is not in `excludeStories` and any of these is true:

1. Its slug is listed in `includeStories`. Pins are shown first, in that order. This is the editor override. Use it when the wording of a real story does not contain the keyword.
2. A keyword of more than one word appears in the title or the deck.
3. Any keyword appears in the title or the deck, and the story shares a tag with the explainer.
4. A keyword of more than one word appears in the story body, and the story shares a tag.

Single words are not searched in the body, so a passing "foster" or "liver" does not attach the wrong guide. Image captions and credits are not searched. `excludeStories` always wins, including over a pin. A typo in either list fails validation, because the slug has to be a real story file. A pin has to be a published story.

The explainer page lists at most six stories. Pins take the first slots. The rest are the strongest automatic matches. A story page can still link the explainer when the story matches but did not make that six. The story page shows at most two explainers.

`tags` do a second job. On a topic hub such as `/topic/food-banks`, any explainer that lists that tag gets a "Learn how this works" link. Use the specific tags from `lib/tags.ts`. Do not add a broad tag only to collect more stories. Keywords plus a pin are the precise tools.

Pick a new explainer when the archive already has several stories about that kind of help. A topic with one clear story can still be a page if the story is really about that system, as with a community fridge. Do not add a guide for a topic the archive does not cover.

Set `draft: true` until the sources are checked. A draft is validated and left off the site. `date` is the day you published the explainer. Set `updated` when you change a fact. Run `npm run validate-stories` before you commit. The check fails if an explainer links no archive story, if a HowTo has no steps, or if the sitemap is missing the pages.
## Good news on this day

`/on-this-day` is a calendar. `/on-this-day/october-25` is one evergreen page. `/on-this-day/today` sends a reader to the page for the current date in America/Denver. The pages are static. Historical milestones live in `data/on-this-day.json`, not in a story file.

A day page shows three things:

- Verified milestones for that month and day, each with a year, a one- or two-sentence account, a one-sentence read-aloud line, and at least one source link.
- Two classroom questions.
- Archive stories whose publish date falls on that month and day in any year. If the archive has none, the page says so.

### Citation rule

Do not add a milestone you cannot verify. Open the source and check that it states the year and the facts you are about to write. If it does not, leave the entry out. Do not guess a date, a number, or a name.

Every citation has to be `https` and a specific page, not a homepage, on a reputable host. Use Britannica, NASA, the Smithsonian, the Library of Congress, the National Archives, the National Park Service, WHO, the United Nations, a university, a government site, a scientific journal, or a major newspaper. The host list is enforced in `lib/on-this-day-schema.ts`. Wikipedia can help you find a lead. It is not a citation. Do not cite it.

Skip war, battles, disasters, crimes, and anniversaries that are mostly about harm, even when something good came later. Keep the wording plain enough for a teacher to read with children about ages 6 to 12. The read-aloud line is one sentence. The account is one or two. The two prompts are questions.

October 25 through December 31 must keep two to four milestones each. Other days can be added the same way. A day with no file entry still has a page, with the archive stories and a short note.

```json
{
  "month": 12,
  "day": 17,
  "prompts": [
    "Why might a short first flight still matter years later?",
    "What is something hard your class could try, even if the first attempt is small?"
  ],
  "entries": [
    {
      "year": 1903,
      "text": "On December 17, 1903, at Kill Devil Hills, North Carolina, Wilbur and Orville Wright made the first sustained flights of a heavier-than-air machine under the pilot's control. Orville's first flight lasted 12 seconds, and Wilbur's longest flight that morning lasted 59 seconds.",
      "kidLine": "Two brothers flew the first powered airplane, and the longest flight that morning lasted 59 seconds.",
      "sources": [
        { "name": "Library of Congress", "url": "https://www.loc.gov/item/today-in-history/december-17/" }
      ]
    }
  ]
}
```

`updated` at the top of the file is the day the milestone list was last checked. `npm run validate-stories` rejects a bad year, a missing citation, a third sentence, a homepage link, a host that is not on the list, and a gap in the October 25 through December 31 window.
## Good Neighbor of the Month

The ballot is built from the month's archive. To force a story on, or to drop one the automatic pick included, edit `data/good-neighbor.json`. `pin` and `exclude` are slug lists for that `YYYY-MM`. A pinned story is dated in that month and already published. At most 12 pins. `winner` is optional and is used after the 25th. The README has the file shape and the storage flag for shared vote totals. Until that flag is set, readers cheer a favorite in the browser and nothing about them is stored.
