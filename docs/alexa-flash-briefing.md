# Alexa Flash Briefing

Tazzora already publishes a spoken daily Top 5. An Alexa Flash Briefing skill points at that feed. There is no paid host, no audio file, and no account beyond a free Amazon developer account. The site serves the feed on every deploy from `main`.

The publication name in the script comes from `site.config.ts`. Do not put a person's name in the skill, the preamble, or the error message.

## URLs

| What | URL |
| --- | --- |
| Alexa feed (use this in the skill) | `https://www.tazzora.com/briefing/alexa.json` |
| Human page | `https://www.tazzora.com/briefing` |
| One day | `https://www.tazzora.com/briefing/YYYY-MM-DD` |
| Plain RSS of the same scripts | `https://www.tazzora.com/briefing/feed.xml` |

The JSON feed is the one Amazon should request. The RSS file is for anyone else. It lists every briefing day, so it is longer than Alexa will read.

A day with fewer than five stories has no page and is not in the sitemap.

## What the JSON contains

`Content-Type` is `application/json`. The body is an array of text items, newest day first. There is no `streamUrl` and no audio file. Each item has:

| Field | Value |
| --- | --- |
| `uid` | Stable id for that day, `briefing-YYYY-MM-DD`. |
| `updateDate` | UTC ISO 8601 time, `YYYY-MM-DDThh:mm:ss.sssZ`. |
| `titleText` | Short title for the Alexa app, such as "Good news for November 4, 2026". |
| `mainText` | The spoken script. |
| `redirectionUrl` | The human page for that day. |

The latest item is the same Top 5 as the homepage and the daily email (`getTop5` in `lib/stories.ts`). A rank can still sit on a story filed the day before, and that story is included. Earlier days use the same per-day selector as the web stories.

`mainText` is a short intro ("Here's your good news from Tazzora."), the five stories in one or two sentences each with the place and "Reported by" plus the original outlet, and a sign-off that points to tazzora.com. URLs, emoji, and symbols that text-to-speech reads badly are removed.

Amazon's feed reference (last updated February 8, 2024) says a text item must be **fewer than 4,500 characters**. The build keeps `mainText` under that. The same page says Alexa reads at most **five** items and ignores items **older than seven days**. This feed follows both limits. A day is left out of the JSON when it would repeat a story already spoken in a newer item.

Source: [Flash Briefing Skill API Feed Reference](https://developer.amazon.com/en-US/docs/alexa/flashbriefing/flash-briefing-skill-api-feed-reference.html).

## Create the skill

1. Sign in at [developer.amazon.com](https://developer.amazon.com/). The developer account is free.
2. Create a skill. Suggested name: **Tazzora Good News**. The name must not imply sponsorship by Amazon.
3. Default language: **English (US)**. You cannot change this later.
4. Model: **Flash Briefing**.
5. Hosting: **Provision your own**. The feed is already on this site. You do not add an AWS backend.
6. Custom error message, in English, for when the feed is down. Suggestion: "The good news briefing is not available right now. Please try again in a little while."

Then add one feed. The first feed is the default.

| Console field | What to enter |
| --- | --- |
| Preamble | `From Tazzora, your daily good news.` English preambles must start with "In" or "From" and are limited to 70 characters. This one is 35. |
| Name | `Daily Top 5` |
| Content update frequency | **Daily** |
| Content type | **Text** |
| Content genre | **Headline News** |
| Feed | `https://www.tazzora.com/briefing/alexa.json` |
| Feed icon | A **512 × 512** PNG or JPG. See below. |

Save, then enable testing in the developer console. In the Alexa app, open More, then Settings, then News, then Flash Briefing, and turn the skill on. Ask for the flash briefing. Submit the skill for certification when that sounds right. Certification is Amazon's review. It is not a paid listing.

Amazon requests the feed about every 15 minutes. A new morning edition is usually audible within half an hour of the deploy.

## Icons

The feed icon and the skill-store icons are different sizes.

| Use | Required | In this repo |
| --- | --- | --- |
| Feed icon | 512 × 512 PNG or JPG | `https://www.tazzora.com/brand/favicon-512.png` is already 512 × 512 PNG. It is the sun mark on a cream square, with no wordmark and no transparency. It can be uploaded as the feed icon. |
| Small skill icon | 108 × 108 PNG, transparent, about 16 px of padding | Not in the repo. |
| Large skill icon | 512 × 512 PNG, transparent, about 75 px of padding | Not in the repo at that size and padding. |

Square logos you can resize:

- `https://www.tazzora.com/brand/tazzora-square-1024.png` is 1024 × 1024, cream background, sun mark and wordmark.
- `https://www.tazzora.com/brand/tazzora-square-1024-transparent.png` is 1024 × 1024, transparent background, sun mark and wordmark.
- Favicons also exist at 48, 96, and 192 (`/brand/favicon-48.png`, `/brand/favicon-96.png`, `/brand/favicon-192.png`). None of those is 108 × 108.

The transparent 1024 square is the file to crop for the two skill-store icons. It is not already padded the way Amazon recommends, so add the padding when you export 108 and 512.

## After the skill is public

`site.config.ts` keeps the speaker note generic until you flip it:

```ts
export const alexaBriefing = {
  published: false,
  skillUrl: "",
} as const;
```

When the skill is live, set `published` to `true` and put the public skill link in `skillUrl` (an `https://` URL). The briefing page then tells a listener how to turn it on and links the skill. Until then the page says a smart-speaker briefing is coming soon. Leave the link empty rather than inventing one.
