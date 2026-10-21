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

## Add a story

See [ADDING_STORIES.md](ADDING_STORIES.md). Short version: add `stories/your-slug.md` and a credited image in `public/images/stories/`, then run `npm run validate-stories`. A daily job can publish by committing those files.

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

## Deploy on Vercel

1. Import this GitHub repo in Vercel. Framework preset: Next.js. Build command: `npm run build`. Install command: `npm install`.
2. For Buttondown, set `BUTTONDOWN_API_KEY`. Or set `EMAIL_PROVIDER` and `EMAIL_API_KEY` together; that pair takes precedence. Leave every email key empty and signups still succeed and log.
3. For story tips, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`. For Gmail or Google Workspace use `smtp.gmail.com`, port `465`, user `cheers@tazzora.com`, and an app password. Leave them unset and the form still thanks the reader; the tip is logged (and webhooked if `SUBMISSION_WEBHOOK_URL` is set). The build does not require them.
4. Add `SUBMISSION_WEBHOOK_URL` if tips should also reach a webhook. The filesystem on Vercel does not keep `inbox.jsonl`.
5. Deploy. `main` (or a merged pull request) publishes the site.
6. Add `tazzora.com` and `www.tazzora.com` in the Vercel project settings. Production currently redirects the apex to `www`, and absolute URLs in `site.config.ts` follow that host. The domain is registered at GoDaddy, so point those DNS records at Vercel after the project is deployed. A later rename is still just `site.config.ts`.
7. Optional, for Search Console and Bing HTML-tag verification: set `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` (see `.env.example`) and redeploy. A production build also pings IndexNow when `VERCEL_ENV=production`.

Sitemaps and feeds:

- `https://www.tazzora.com/sitemap.xml`
- `https://www.tazzora.com/news-sitemap.xml` (stories from the last 48 hours)
- `https://www.tazzora.com/rss.xml`
- `https://www.tazzora.com/atom.xml`
- `https://www.tazzora.com/smartnews.xml` (SmartNews only; the other feeds do not use the SmartNews namespace)
- `https://www.tazzora.com/world/rss.xml` (stories from outside the United States)
- `https://www.tazzora.com/kids/rss.xml`
- `https://www.tazzora.com/category/animals/rss.xml` (same pattern for every section)
- `https://www.tazzora.com/state/colorado/rss.xml` (same pattern for every state, including an empty channel)
- `https://www.tazzora.com/country/japan/rss.xml` (same pattern for every country slug; not listed on `/feeds`)
- `https://www.tazzora.com/feeds` (copy links, plus Feedly and Inoreader, for the feeds above except country feeds)

For a newsroom, nonprofit, school, or reporter named in a story:

- `https://www.tazzora.com/featured` is the badge, the embed code, and suggested share text.
- `https://www.tazzora.com/featured/{story-slug}` fills that kit in for one story. Those pages are noindex and are not in the sitemap.
- `https://www.tazzora.com/widgets` has a headline widget for each state and a latest widget. `/embed/latest` and `/embed/{state-slug}` are the frames. They do not use cookies.

English stays at the site root. `lib/i18n.ts` is the hreflang list for a future translated edition. Adding a locale there, with a path prefix such as `/es`, is the extension point. Current URLs do not move.

State-and-category pages (`/state/colorado/animals`), city pages, and topic pages are added to the sitemap only after at least three stories support them. Country pages with fewer stories stay on `/world` and are left out of the sitemap.

The project is the App Router. No extra Vercel config file is required. Do not add `middleware.ts`: it runs on every request. Story photos stay as plain images (`images.unoptimized`) because they are already sized WebP files. Pages, feeds, and sitemaps are static build output with long cache headers; the only functions are the forms (`/api/subscribe`, `/api/submit`, `/api/cheer`) and a search query.

## What's left

- Cheer counts are the number in the story file, plus one in the reader's browser. `POST /api/cheer` only logs. A database can make counts shared.
- Story tips are emailed when `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` are set. Otherwise they are logged and optionally webhooked. They are not in a database yet (`lib/submissions.ts`).
- Membership is a waitlist. Card billing is not wired.
- ZIP lookup uses prefix ranges. It is good enough to jump to a state, not a town-level geocoder.
- Short vertical video for social is not in this version.
