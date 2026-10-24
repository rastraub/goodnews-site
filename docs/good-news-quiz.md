# Good News Quiz

A quiz page for each Monday-start week since launch that can fill five questions. The pages are static HTML from `npm run build`. Nothing in the quiz calls an AI model, a quiz API, or any other network service at build time or when someone plays.

The publication name, site URL, and byline all come from `site.config.ts`. The byline is `editor.name` there (the editorial team). Do not put a person's name on a quiz page.

## URLs

- `/quiz` lists every quiz, newest first.
- `/quiz/YYYY-MM-DD` is one week. The date is the Monday, the same Monday used by `/week/YYYY-MM-DD`.
- `?kids=1` opens kid mode after the page loads. The quiz is still the static page. The flag is not an account and is not stored.

Weeks before launch, weeks that have not started, and draft stories are left out. A week is included when its published stories can fill at least five questions. The open week (the Mountain Time week that contains the build day) is included and marked so far, same as the weekly roundup. A finished week does not change unless its story files change.

`lib/weeks.ts` owns the Monday rule (`weekStart`). The quiz does not invent a second calendar.

## How a question is built

`lib/quiz.ts` reads the published story files. For a week id (the Monday date, or that date plus `:kid` for kid mode) it:

1. Shuffles that week's stories and the question kinds with a fixed hash of the week id. The same files always produce the same quiz. `Math.random()` is not used.
2. Picks a length of 5, 6, or 7 from that same hash.
3. Builds a multiple-choice question only when the story has the fact and three different wrong answers exist.
4. Prefers one question per story and a mix of kinds. If that cannot fill the length, it allows a second question from the same story, then repeats a kind. It never publishes a quiz with fewer than five questions or more than seven.

Kinds:

| Kind | Prompt | Answer |
| --- | --- | --- |
| State | Which state is this headline from? | USPS state on the story. Stories outside the United States are skipped. |
| Town | Which town is this headline from? | The story `city` field. |
| Country | Which country is this headline from? | Country name. The subject is never a United States story, so the question is not always the same country. |
| Section | Which section does this headline belong in? | The story category label (Heroes, Animals, Science, Community, Health & Tech). |
| Headline | Which headline matches this photo? | The story `shortTitle`, or the title when there is no short title. |
| Photo | Which photo matches this headline? | The story photo. |

The headline in the prompt is the short title when the file has one of at least eight characters. If that headline already contains the answer (the state name, the town, the country, or the section), that question is skipped so the prompt does not give it away.

Wrong answers are the same kind of fact from other stories. Stories from the same week are used first. If the week does not have three different choices, older and newer published stories fill in. Two choices are never the same text. For a state question, `alsoStates` on that story are not offered as wrong answers, because those states are also part of the report.

Each choice remembers which story it came from. The right choice is that question's story. `scripts/validate-stories.ts` checks this on every quiz, checks that generation is repeatable, and checks that every week with at least 10 published stories has a quiz. A thinner week is published when it can still fill five questions, and left out when it cannot, so a one-story Monday does not fail the build.

## Kid mode

Kid mode is a second set of 5 to 7 questions built only from stories with `kidFriendly: true`. Every choice, including the wrong ones, comes from a classroom story, so a wrong headline is still one a teacher marked for class.

The set is dropped when those stories cannot fill five questions. The switch is hidden in that case. Turning kid mode on starts the quiz over. It does not save a setting in the browser.

Classroom fields are described in [ADDING_STORIES.md](../ADDING_STORIES.md).

## Playing, sharing, and printing

The player is `components/quiz-player.tsx`. It runs in the browser:

- Choices are a radio group. Arrow keys move. Enter or Space locks the choice in. A click locks it in too. Feedback is immediate and does not contact the server.
- After a choice, the page links to that story.
- The last screen is the score, a share button, and the existing email signup (`components/email-signup.tsx`) for the morning Top 5. The note on that form says the list is for adults.
- Share uses the Web Share API. If that is missing or fails, the same text is copied to the clipboard. If the clipboard is blocked, the text is shown in a field the reader can copy. Canceling the share sheet does not copy.
- The score line is `I got 6/7 on this week's [site name] Good News Quiz` plus the page URL. It does not include a question or an answer. Kid mode adds `?kids=1` to the URL only.
- There is no account, no tracking cookie, and no saved score. The score lives in the page until it is closed or shared.

Printable view lists every question. The answer key is a closed `<details>` block at the bottom. Open it before printing when a teacher wants the key. Leave it closed for a student copy. The browser print dialog (`Print`) uses the same sheet. In kid mode, the printed sheet is the kid-mode set.

## Metadata, sitemap, and IndexNow

Each quiz page sets a title, description, canonical URL, and Open Graph and Twitter image from that week's photo through `listingMeta` in `lib/seo.ts`. The description does not include answers.

JSON-LD on a quiz page is `Quiz` and `LearningResource`, with one `Question` per item, an `acceptedAnswer`, and `suggestedAnswer` values for the other choices. The author is an `Organization` whose name is `editor.name`. The index page is a `CollectionPage` and `LearningResource`.

`/quiz` and each `/quiz/YYYY-MM-DD` are in `app/sitemap.ts`. `scripts/indexnow.ts` pings `/quiz` and each quiz URL on a production deploy, the same way it pings weekly roundups. Preview builds skip IndexNow.

The latest quiz is linked from the footer, the header (desktop links, the category bar, and the menu), `/kids` (including place pages and the printable story), and the weekly roundup index and week pages. Those links do not change the homepage hero.

## What you do not add by hand

Do not commit a hand-written question file. Add or edit a story, run `npm run validate-stories`, and the next build rebuilds the quizzes. A story dated into an old week changes that week's quiz. Keep `kidFriendly` accurate, because kid mode trusts it.
