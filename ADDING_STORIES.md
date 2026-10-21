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
| `city` | yes | Town or city. |
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
| `kidQuestions` | with `kidFriendly` | Two or three discussion questions: feelings, kindness, how a class could help, or a simple science or geography question. Leave them off otherwise. |
| `cheers` | no | Starting cheer count. Defaults to 0. Readers add one in their own browser. |
| `draft` | no | `true` keeps it out of the site. It is still validated. |
| `editorApproved` | yes | Must be `true` for anything that is not a draft. This is the publish switch. |
| `correction` | no | Public correction. It appears on the story and on `/corrections`. Feeds and article markup then use a modified time 12 hours after that story's publish time. The file has a date, not a clock time. |

The body under the front matter is the original summary. Write it yourself. Do not paste the source article. Aim for a short, sourced account, at least 40 words. Paragraphs separated by a blank line. Links look like `[label](https://example.com)`.

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

These URLs are created only when at least three published stories belong there. A thinner combination is not a page, so it is not in the sitemap and it does not rank.

- `/state/colorado/animals` is that state's stories in one category.
- `/state/colorado/city/denver` is one US city. The city name is slugified, and the state keeps Springfields apart.
- `/country/japan/city/osaka` is a city outside the United States.
- `/topic/animal-rescue` is a tag shared by at least three stories. The index of those pages is `/topics`.

A country page with fewer than three stories stays linked from the world index, but it is left out of the sitemap and marked noindex. State pages themselves stay up even when a state has only one story. Pick tags from `lib/tags.ts`. Do not invent a tag to force a page. If a real topic is missing from that list, add the slug, a human title such as "Good news about animal rescue", and a one-sentence intro there first. Validation rejects anything else. Topic hubs are in the sitemap and in the IndexNow ping, the same way city and state hubs are.

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
- `/kids/state/colorado` and `/kids/country/japan` exist only when that place has at least one classroom story. A state and a country can share a name, so the path says which is which. An empty place is not a page.
- The teacher email is a separate signup on `/kids` for adults and educators. The list tag is `teachers`. Do not collect a child's name, age, school, or email. Classroom pages do not run ads.

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
   - **For classrooms.** When a story is appropriate to read aloud with children about ages 6 to 12, set `kidFriendly: true` in that story's front matter, write `kidSummary` in about 60 to 110 plain words, and add two or three `kidQuestions`. Stay accurate to the source. Do not invent facts or quotes. Skip the flag for death, serious illness or cancer, violence, crime, accidents with injuries, abuse, war, addiction, and anything a teacher would hesitate to read to a class. Do not force one into the batch. Do not backfill classroom text into `data/story-enrichment.json`. The kids pages and `/kids/print` use these fields. `storyOfTheDay()` in `lib/kids.ts` picks the printable story. The teacher email is a separate adult list. Do not add a child to any list, and do not add ads or anything else that identifies a child.
6. Run `npm run validate-stories` and `npm run build`. Both have to pass. The build prebuilds story, listing, and hub HTML. If the archive outgrows that cap, validation fails on purpose: do not leave the extra pages to render on each request.
7. Commit the new stories, the images, and the rank edits, then push to `main`. The next deploy publishes them.

## Health & Tech

`health-tech` is displayed as "Health & Tech". It is for medical advances, longevity research with real human results, and technology that is already helping people. The bar is stricter than the other categories.

- Publish a result that is already helping people, or that a human trial has shown. A single mouse or cell study is out. So is a "could someday" claim, an IND clearance, a first dose whose safety and benefit are not yet known, or a trial that has not started.
- The source has to be highly respected: a major newsroom, a peer-reviewed journal, a university, or a public-health authority such as the NIH, FDA, or CDC. A company press release is not enough on its own.
- Skip a story that is essentially marketing for a product, a supplement, or a clinic. Skip anti-aging miracle claims.
- The summary has to say plainly what was shown and where the evidence stops. If survival was not measured, say so. If follow-up is short, or only a few patients have had the next step, say so.
