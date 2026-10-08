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
| `state` | yes | Two-letter USPS code, including `DC`. |
| `alsoStates` | no | Other states this story should appear in. Do not repeat `state`. |
| `place` | no | Overrides the default "City, State" label. |
| `category` | yes | `heroes`, `animals`, `science`, or `community`. |
| `sourceName` | yes | The newsroom that reported it. |
| `sourceUrl` | yes | `https` link to the original article. Use the URL exactly. |
| `image` | yes | WebP path under `public`, for example `/images/stories/pony.webp`. Also add `pony-sm.webp`, about 360px wide, for thumbnails. |
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
| `cheers` | no | Starting cheer count. Defaults to 0. Readers add one in their own browser. |
| `draft` | no | `true` keeps it out of the site. It is still validated. |
| `editorApproved` | yes | Must be `true` for anything that is not a draft. This is the publish switch. |
| `correction` | no | Public correction. It appears on the story and on `/corrections`. |

The body under the front matter is the original summary. Write it yourself. Do not paste the source article. Aim for a short, sourced account, at least 40 words. Paragraphs separated by a blank line. Links look like `[label](https://example.com)`.

## Photos

Store images in `public/images/stories/` as WebP. Each story needs the full photo (`pony.webp`, about 840px wide) and a thumbnail (`pony-sm.webp`, about 360px wide). Use photos you have the right to use, credit them, and do not present a stranger's face as the person in the story. A caption should say when a photo is illustrative.

## What the daily job does

A morning batch is new story files. Verify each one, then rotate the homepage so the freshest news is what people see first.

1. Open the source article and confirm the URL, the date, and the facts you plan to summarize. Reputable newsrooms only. Skip politics, tragedy-with-a-silver-lining framing, and anything already in `stories/`.
2. Add `stories/some-new-slug.md`, the full WebP, and the `-sm` thumbnail. Write an original summary of at least 40 words. Do not paste the article.
3. Set `cheers: 0` on every new story. Do not invent a cheer count.
4. Set `editorApproved: true` and `draft: false` only after that check. Until then, keep `draft: true`.
5. Rotate the homepage. Ranks live in front matter. Each `top5` number can be used only once.
   - **Featured.** The hero is the newest story with `featured: true` (newest date wins). Set `featured: true` on the single best story of the day, and set `featured: false` on every other story, including older ones. If an older story is left featured and no newer story is featured, it keeps the hero spot.
   - **Top 5.** Assign ranks `1` through `5` to the five strongest newest stories. Remove `top5` from any story that is leaving that five. If the morning batch has fewer than five stories, fill the remaining ranks from the strongest recent stories already on the site, still using each rank once.
6. Run `npm run validate-stories` and `npm run build`. Both have to pass.
7. Commit the new stories, the images, and the rank edits, then push to `main`. The next deploy publishes them.
