# Tazzora

A fast, mobile-first site for upbeat, verified good news from across America. Stories are Markdown files in this repo. The name, tagline, and domain (tazzora.com) live in one config file, so a rename is a one-line change.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run validate-stories   # check story files and the rename rule
npm run credited-outlets-report   # CSV of newsrooms credited in published stories
npm run giving-tuesday-coverage   # states still missing a Giving Tuesday pick
npm run calendar-coverage   # observances in the next 60 days with fewer than 2 stories
npm run lint
npm run build
npm start
```

## Rename the site

Edit **`site.config.ts`** and nothing else.

That file holds the site name, logo text, tagline, SEO title, description, domain, contact email, and social handles. Metadata, the footer, Open Graph images, the manifest, and email copy all read from it.

After a rename:

```bash
npm run validate-stories
```

The check fails if the name, domain, or social handles appear in source files other than `site.config.ts` and this README.

Set the public URL with `url` (it follows `domain` today). Point the real domain at the Vercel project when the name is final.

## Listen

Story pages and classroom pages can read aloud in the browser, using the device's built-in speech. No speech service, API key, or audio file is required. The controls stay hidden when the browser cannot speak. Speed and voice choices are saved on the device. See [ADDING_STORIES.md](ADDING_STORIES.md) for what the Kid version reads.

## Good News Calendar

`/calendar` lists kindness days and other positive observances for the next 12 months in America/Denver. Each date links to archive stories and, when one exists, a hub such as Veterans Day or Giving Tuesday. `/calendar/{slug}` is one observance. A page with fewer than two matching stories stays up and is left out of the sitemap. `/calendar/good-news.ics` is a static calendar file. Dates and classroom lines live in `data/good-news-calendar.ts`. See [ADDING_STORIES.md](ADDING_STORIES.md).

## Good news on this day

`/on-this-day` is a calendar of evergreen pages, one for every month and day, including February 29. `/on-this-day/october-25` pairs verified historical milestones with archive stories published on that date. `/on-this-day/today` opens the page for the current date in America/Denver. Milestones live in `data/on-this-day.json`. See [ADDING_STORIES.md](ADDING_STORIES.md) for the citation rule. A day with no milestone still renders.

## Add a story

See [ADDING_STORIES.md](ADDING_STORIES.md). Short version: add `stories/your-slug.md` and a credited image in `public/images/stories/`, then run `npm run validate-stories`. A daily job can publish by committing those files.

## Good News Quiz

Each Monday-start week since launch gets a static quiz at `/quiz` and `/quiz/YYYY-MM-DD`. Questions are built at deploy time from that week's story files. There is no model call and no quiz API. Kid mode uses stories marked `kidFriendly`. The byline is the editorial team in `site.config.ts`.

How the questions are chosen, how wrong answers are picked, and how share text stays spoiler-free is written up in [docs/good-news-quiz.md](docs/good-news-quiz.md).

- `https://www.tazzora.com/quiz`
- `https://www.tazzora.com/quiz/2026-10-05`
- `https://www.tazzora.com/quiz/2026-10-12`
- `https://www.tazzora.com/quiz/2026-10-19`

A new week appears on the next production build after that Monday's stories are in the repo. The current week stays in the set and updates when new stories land.

## Email

Copy `.env.example` to `.env.local`.

With **no** email key, the signup form still succeeds and the address is written to the server log. That is the local and preview behavior.

To send signups to Buttondown, set `BUTTONDOWN_API_KEY` to the newsletter API key (this is the variable on the Vercel project). The adapter posts to `https://api.buttondown.com/v1/subscribers` with `Authorization: Token <key>`, `{"email_address": "..."}`, and one tag: `daily`, `membership`, or `teachers`. The teacher tag is only for the adult educator list on `/kids`. An address that is already subscribed is treated as success. Any other failure is returned to the form as an error. The form does not show success when Buttondown rejects the request.

`EMAIL_PROVIDER` and `EMAIL_API_KEY` still work, and they take precedence when **both** are set:

| Variable | Purpose |
| --- | --- |
| `BUTTONDOWN_API_KEY` | Buttondown API key. Used when the pair below is not set. |
| `EMAIL_PROVIDER` | `buttondown`, `beehiiv`, or `resend` |
| `EMAIL_API_KEY` | That provider's API key |
| `EMAIL_PUBLICATION_ID` | Beehiiv publication id |
| `EMAIL_AUDIENCE_ID` | Resend audience id |

When `EMAIL_PROVIDER` is `buttondown`, the same subscribers endpoint and `Token` header are used, including the `daily`, `membership`, or `teachers` tag. The `BUTTONDOWN_API_KEY` path sends that tag too.

Beehiiv uses `Authorization: Bearer` and `POST https://api.beehiiv.com/v2/publications/{EMAIL_PUBLICATION_ID}/subscriptions`.

Resend uses `Authorization: Bearer` and `POST https://api.resend.com/audiences/{EMAIL_AUDIENCE_ID}/contacts`.

If the provider rejects an address, the form shows an error. If no key is set, it logs and shows success.

## Story tips

`POST /api/submit` validates the form and calls `handleStorySubmission` in `lib/submissions.ts`. The Submit a story form is the reader tip form. It keeps a hidden honeypot field and a per-IP rate limit (5 tips a minute). Names, emails, cities, summaries, and links have length limits. Line breaks are stripped from single-line fields, and the email body escapes HTML.

- Every tip is logged.
- When `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are all set, the tip is emailed with nodemailer. From and To are the site mailbox (`cheers@tazzora.com`, `siteConfig.contactEmail`). Reply-To is the submitter's email. The subject looks like `[Tazzora story tip] Neighbors fixed the library roof...`. The body lists every submitted field, the page URL, and a timestamp.
- Intended mail host: Gmail or Google Workspace. `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465` (implicit TLS), `SMTP_USER=cheers@tazzora.com`, and `SMTP_PASS` set to an app password for that mailbox. Port 587 uses STARTTLS instead.
- If any SMTP variable is missing or the port is not a number, the server logs that and does not send mail. The form still shows the thank-you message. `npm run build` does not need these variables.
- When the disk is writable, the tip is appended to `data/submissions/inbox.jsonl` (gitignored).
- Set `SUBMISSION_WEBHOOK_URL` to POST the same JSON to Slack, Zapier, or another inbox. That request still runs when SMTP is not configured.

A database for tips is still a later step. See below.

## Good Neighbor of the Month

A reader ballot for one neighbor, or a small group, who did something kind. Pages:

- `/good-neighbor` is the current month.
- `/good-neighbor/YYYY-MM` is that month's archive. The current month's archive URL points its canonical tag at `/good-neighbor`.
- `/good-neighbor/winners` lists named winners.

Voting is open on the 1st through the 25th, Eastern Time, the same clock as the edition line. On the 26th the month shows results. The next morning deploy is what flips the static page. The badge on a story and the winners index follow that deploy when the tally is in the file store. With Upstash, the ballot, the winners index, and the story badge also check the API in the browser.

Nominees are chosen in `lib/good-neighbor.ts` from that month's archive: an individual or small group doing something kind, in Heroes, Community, or a person-scale animal story. Science, health-tech, wildlife programs, and on-duty first-responder stories stay off. Those responder stories already have `/topic/first-responders`. The ballot aims for 10 stories and stays between 8 and 12. A thin month shows however many qualify.

**Storage decision.** This repo does not have a database. Cheers are a log line plus a browser flag. Story tips are email, an optional webhook, and a gitignored `inbox.jsonl` that Vercel does not keep. The newsletter key talks to an email vendor, not a vote box. Shared Good Neighbor totals are therefore **off**. The page ships with **Cheer your favorite**: one cheer per browser per month, stored in `localStorage`, not sent to the server. The share line is still `I voted for … on Tazzora`. No voter name, email, or IP is stored. Nothing new was added that the owner has to pay for or sign up for.

To turn on shared totals later, pick one store. Both need `GOOD_NEIGHBOR_IP_SALT` set to a long random string (at least 16 characters). The salt only hashes the browser id and, for rate limits, the network address. The raw address is not written down.

| `GOOD_NEIGHBOR_VOTES` | Also set | Use it when |
| --- | --- | --- |
| unset | | Cheer fallback. This is the default. |
| `file` | `GOOD_NEIGHBOR_IP_SALT` | A host with a persistent disk. Votes go in `data/good-neighbor-votes.json` (gitignored). Do not use this on Vercel. The filesystem there does not keep the file. |
| `upstash` | `GOOD_NEIGHBOR_IP_SALT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Vercel. Create a free Redis database at Upstash (Vercel KV is the same REST API). No npm package is added. The URL must be `https`. |

If the flag is set but the settings are incomplete, the site stays on the cheer fallback and logs a warning. The API is `/api/good-neighbor`. It rate-limits by a hash of the IP, refuses a second vote from the same browser id, and returns only story slugs and counts.

**Pin and exclude.** Edit `data/good-neighbor.json`. Pins are forced onto that month's ballot first, even if the automatic filters would drop them. Excludes are removed. A pin has to be a published story dated in that month. At most 12 pins. Do not list a slug in both arrays. `winner` is optional. After the 25th it names the winner even if the tallies disagree. The slug has to be on the ballot, so pin it first if the filters would leave it off.

```json
{
  "2026-10": {
    "pin": ["fort-myers-diner-second-chance"],
    "exclude": ["overland-park-warm-arms"],
    "winner": "wyandotte-roof-tarp"
  }
}
```

Leave `pin` and `exclude` as empty arrays when you are not overriding that month. `npm run validate-stories` fails if a slug is unknown, drafted, or dated outside the month.

The byline on these pages is the Tazzora Editorial Team. Vote totals never include a person's name.

## Deploy on Vercel

1. Import this GitHub repo in Vercel. Framework preset: Next.js. Build command: `npm run build`. Install command: `npm install`.
2. For Buttondown, set `BUTTONDOWN_API_KEY`. Or set `EMAIL_PROVIDER` and `EMAIL_API_KEY` together; that pair takes precedence. Leave every email key empty and signups still succeed and log.
3. For story tips, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. For Gmail or Google Workspace use `smtp.gmail.com`, port `465`, user `cheers@tazzora.com`, and an app password. Leave them unset and the form still thanks the reader; the tip is logged (and webhooked if `SUBMISSION_WEBHOOK_URL` is set). The build does not require them.
4. Add `SUBMISSION_WEBHOOK_URL` if tips should also reach a webhook. The filesystem on Vercel does not keep `inbox.jsonl`.
5. Deploy. `main` (or a merged pull request) publishes the site.
6. Add `tazzora.com` and `www.tazzora.com` in the Vercel project settings. Production currently redirects the apex to `www`, and absolute URLs in `site.config.ts` follow that host. The domain is registered at GoDaddy, so point those DNS records at Vercel after the project is deployed. A later rename is still just `site.config.ts`.
7. Optional, for Search Console and Bing HTML-tag verification: set `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` (see `.env.example`) and redeploy. A production build also pings IndexNow when `VERCEL_ENV=production`.

Sitemaps and feeds:

- `https://www.tazzora.com/sitemap.xml` (includes `/explainers` and each explainer)
- `https://www.tazzora.com/explainers` (evergreen guides; not a news feed)
- `https://www.tazzora.com/news-sitemap.xml` (stories from the last 48 hours)
- `https://www.tazzora.com/good-news-index` (monthly editions; each month also has `/good-news-index/YYYY-MM/index.csv`)
- `https://www.tazzora.com/rss.xml`
- `https://www.tazzora.com/atom.xml`
- `https://www.tazzora.com/smartnews.xml` (SmartNews only; the other feeds do not use the SmartNews namespace)
- `https://www.tazzora.com/world/rss.xml` (stories from outside the United States)
- `https://www.tazzora.com/kids/rss.xml`
- `https://www.tazzora.com/es/rss.xml` (weekly Top 5 in Spanish)
- `https://www.tazzora.com/category/animals/rss.xml` (same pattern for every section)
- `https://www.tazzora.com/state/colorado/rss.xml` (same pattern for every state, including an empty channel)
- `https://www.tazzora.com/country/japan/rss.xml` (same pattern for every country slug; not listed on `/feeds`)
- `https://www.tazzora.com/feeds` (copy links, plus Feedly and Inoreader, for the feeds above except country feeds)

For a newsroom, nonprofit, school, or reporter named in a story:

- `https://www.tazzora.com/featured` is the badge, the embed code, and suggested share text.
- `https://www.tazzora.com/featured/{story-slug}` fills that kit in for one story. Those pages are noindex and are not in the sitemap.
- `https://www.tazzora.com/widgets` has a headline widget for each state and a latest widget. `/embed/latest` and `/embed/{state-slug}` are the frames. They do not use cookies.

English stays at the site root. Spanish is a weekly Top 5 at `/es/buenas-noticias/{monday}`, not a copy of every URL. `lib/i18n.ts` pairs each edition with that week's English roundup. Do not add a blanket `/es` prefix there. Current English URLs do not move. See [ADDING_STORIES.md](ADDING_STORIES.md) for how a week gets a Spanish file.

State-and-category pages (`/state/colorado/animals`) and topic pages are added to the sitemap only after at least three stories support them. A city page (`/state/colorado/city/denver`) exists for every city in the archive. It enters the sitemap at two stories. A one-story city page stays linked from its state or country page and is marked noindex. Country pages with fewer than three stories stay on `/world` and are left out of the sitemap.

The project is the App Router. No extra Vercel config file is required. Do not add `middleware.ts`: it runs on every request. Story photos stay as plain images (`images.unoptimized`) because they are already sized WebP files. Pages, feeds, and sitemaps are static build output with long cache headers; the only functions are the forms (`/api/subscribe`, `/api/submit`, `/api/cheer`, `/api/good-neighbor`) and a search query. The Good Neighbor page does not call that route until `GOOD_NEIGHBOR_VOTES` is fully configured.

## Good News Index

`/good-news-index` is the archive of monthly editions, starting with October 2026. `/good-news-index/YYYY-MM` is that month, generated at build time from published story files. A later month appears on the next build once it has a published story. Do not hand-edit ranks or totals.

The open month is marked month to date and shows the newest story date in the edition. Counts are stories Tazzora published: by state (and per 1 million residents), category, topic, classroom flag, How to help link, and country. The population denominator is the July 1, 2024 U.S. Census resident estimate in `lib/population.ts` (`NST-EST2024-POP`). The index is not a measure of how good a state is.

A production deploy pings IndexNow for the landing page and each edition, the same way it pings weekly roundups. The news sitemap stays stories from the last 48 hours. The index is a dataset page, so it is in `sitemap.xml` and not in `news-sitemap.xml`.

## What's left

- Cheer counts are the number in the story file, plus one in the reader's browser. `POST /api/cheer` only logs. A database can make counts shared.
- Good Neighbor totals are a cheer in the browser until `GOOD_NEIGHBOR_VOTES` is `file` or `upstash`. See Good Neighbor of the Month above.
- Story tips are emailed when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are set. Otherwise they are logged and optionally webhooked. They are not in a database yet (`lib/submissions.ts`).
- Membership is a waitlist. Card billing is not wired.
- ZIP lookup uses prefix ranges. It is good enough to jump to a state, not a town-level geocoder.
- Short vertical video for social is not in this version.
