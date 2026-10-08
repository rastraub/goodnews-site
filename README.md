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

To send signups to Buttondown, set `BUTTONDOWN_API_KEY` to the newsletter API key (this is the variable on the Vercel project). The adapter posts to `https://api.buttondown.com/v1/subscribers` with `Authorization: Token <key>` and `{"email_address": "..."}`. An address that is already subscribed is treated as success. Any other failure is returned to the form as an error. The form does not show success when Buttondown rejects the request.

`EMAIL_PROVIDER` and `EMAIL_API_KEY` still work, and they take precedence when **both** are set:

| Variable | Purpose |
| --- | --- |
| `BUTTONDOWN_API_KEY` | Buttondown API key. Used when the pair below is not set. |
| `EMAIL_PROVIDER` | `buttondown`, `beehiiv`, or `resend` |
| `EMAIL_API_KEY` | That provider's API key |
| `EMAIL_PUBLICATION_ID` | Beehiiv publication id |
| `EMAIL_AUDIENCE_ID` | Resend audience id |

When `EMAIL_PROVIDER` is `buttondown`, the same subscribers endpoint and `Token` header are used. That path also sends a tag, `daily` or `membership`.

Beehiiv uses `Authorization: Bearer` and `POST https://api.beehiiv.com/v2/publications/{EMAIL_PUBLICATION_ID}/subscriptions`.

Resend uses `Authorization: Bearer` and `POST https://api.resend.com/audiences/{EMAIL_AUDIENCE_ID}/contacts`.

If the provider rejects an address, the form shows an error. If no key is set, it logs and shows success.

## Story tips

`POST /api/submit` validates the form and calls `handleStorySubmission` in `lib/submissions.ts`.

- Every tip is logged.
- When the disk is writable, it is appended to `data/submissions/inbox.jsonl` (gitignored).
- Set `SUBMISSION_WEBHOOK_URL` to POST the same JSON to Slack, Zapier, or an editor inbox.

Persistent storage is still a TODO. See below.

## Deploy on Vercel

1. Import this GitHub repo in Vercel. Framework preset: Next.js. Build command: `npm run build`. Install command: `npm install`.
2. For Buttondown, set `BUTTONDOWN_API_KEY`. Or set `EMAIL_PROVIDER` and `EMAIL_API_KEY` together; that pair takes precedence. Leave every email key empty and signups still succeed and log.
3. Add `SUBMISSION_WEBHOOK_URL` if tips should reach an editor inbox. The filesystem on Vercel does not keep `inbox.jsonl`.
4. Deploy. `main` (or a merged pull request) publishes the site.
5. Add `tazzora.com` as the custom domain in the Vercel project settings. The domain is registered at GoDaddy, so point those DNS records at Vercel after the project is deployed. A later rename is still just `site.config.ts`.

The project is the App Router, static pages, `sitemap.xml`, and `/rss.xml`. No extra Vercel config file is required.

## What's left

- Cheer counts are the number in the story file, plus one in the reader's browser. `POST /api/cheer` only logs. A database can make counts shared.
- Story tips are logged and optionally webhooked. They are not in a database yet (`lib/submissions.ts`).
- Membership is a waitlist. Card billing is not wired.
- ZIP lookup uses prefix ranges. It is good enough to jump to a state, not a town-level geocoder.
- Short vertical video for social is not in this version.
