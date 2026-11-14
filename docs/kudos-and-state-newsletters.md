# Kudos cards and state newsletters

Both features use the publication name, byline, and contact address from `site.config.ts`. The byline stays the editorial team. Do not add a person's name.

## Kudos cards

Readers can thank a helper in a story: a nurse, a teacher, a crossing guard, a firefighter crew, or a volunteer group. The card links back to the story. Printing, copying, the PNG download, Web Share, and the email and text links all open the reader's own device. The site does not send the card, and it does not ask for or store a phone number or an email address for the card.

### Routes

- `/kudos` explains the idea, lists recent eligible stories, and includes a classroom note. This hub is indexed, linked from the footer, and included in `app/sitemap.ts`.
- `/kudos/{story-slug}` is one printable half-page card (letter paper, fold or cut on the line). These pages are thin, so each one sets `robots: { index: false, follow: true }` and is left out of the sitemap.

Eligible story pages link to their card with "Send a kudos card". The same hub is linked from the kids pages, Good News Friday, and the Kindness Challenge.

### Who gets a card

A story is left off when any of these match:

- The heavy-news filter in `lib/news-break.ts` (politics, shootings, use of force).
- The first-responder exclusion phrases in `lib/first-responders-day.ts` (use of force, shooting, pursuit, a crime suspect, politics).
- The kindness block in `lib/world-kindness-day.ts` (a tragedy in the headline or deck, and extra harm). "Nobody was killed" is treated as a rescue outcome and stays eligible.
- A short extra check for a crime victim, abuse, or suicide.
- The slug is listed in `data/kudos-exclude.json`.

Rescue and lifesaving stories stay eligible. An editor can remove a story the filters would keep by adding its slug:

```json
{ "exclude": ["story-slug-here"] }
```

The slug has to be a published story. A duplicate or an unknown slug fails `npm run validate-stories`.

The honoree is chosen only from text already in the story data:

1. A how-to-help label that also appears in the title or deck.
2. Otherwise a role in the title, then the deck (teacher, nurse, firefighter, search-and-rescue volunteers, and the other roles in `lib/kudos.ts`).
3. Otherwise a role tag.
4. If none of those are present, the card says "the volunteers in this story".

Names in the body are not copied onto the card, so a reporter or the person who was helped is not treated as the honoree.

The reader can pick one of three thank-you lines or edit the line in the browser. The From line is blank. The card shows the story URL and "Shared via" the publication name.

## Optional state on the newsletter form

The existing signup form has a "Your state (optional)" select: the 50 states, the District of Columbia, and "Outside the US". Leaving it blank sends the same request as before.

On a state page (`/state/{slug}`), that state is preselected. City pages under a state preselect it too. The reader can still clear the field.

The value is passed only when one is chosen:

- Buttondown, both the `BUTTONDOWN_API_KEY` path and `EMAIL_PROVIDER=buttondown`, still posts to `POST /v1/subscribers` with the same interest tag (`daily`, `membership`, or `teachers`). A chosen state is metadata on that body, `{ "state": "state-co" }` (`state-dc`, `state-outside-us`). Metadata is omitted when no state is chosen. A new tag is not created, because creating tags depends on the newsletter plan. This uses the subscriber call the site already makes. It does not call an email-create or send endpoint.
- Beehiiv adds a `state` custom field on the existing subscription call only when a state is chosen.
- Resend's current contact call has no metadata field, so the state is not sent and the signup still succeeds.
- With no email key, the address is still only logged. The log line gains `state=state-co` when a state was chosen, and stays the same when it was not.

An unknown state value is ignored. The signup continues with no state.

## Weekly state digest

```bash
npm run newsletter:state-digest -- --state CO --week YYYY-MM-DD
```

`--state` is a USPS code, including DC. `--week` is any calendar day. Stories are grouped with the Monday week used by the weekly roundup, Monday through Sunday.

The command writes files under `output/state-digests/{Monday}/`:

- `{code}.md` and `{code}.html`, a "Good news from {State}" draft
- `coverage.md` and `coverage.html`, every state and DC, and whether that week has 3 or more published stories

A story counts for a state when that state is its home state or listed alongside it. Drafts are left out. The folder is gitignored.

The script only writes those files. It does not send mail and does not call an email vendor. A person reviews the draft before anyone sends it.
