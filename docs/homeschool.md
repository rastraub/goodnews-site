# Homeschool packs and word searches

Both pages use the Monday week key from `/week` and `/classroom/week`. `2026-10-19` is the week of October 19 through October 25. A story dated any day in that range belongs to `2026-10-19`. Sunday belongs to the Monday before it. Weeks before launch, and weeks that have not started in America/Denver, are not pages.

Do not hand-write a pack or a puzzle. Do not invent a summary, a discussion question, a vocabulary word, or a puzzle word. The pages rebuild from story files at build time.

## Homeschool (`/homeschool`)

This is for parents and co-ops. It is not the teacher lesson pack. Teachers stay on `/classroom`.

A story is ready when it is published, not a draft, `kidFriendly: true`, and `kidSummary` is at least 40 characters. The index lists a week once it has one ready story, newest first.

Each pack prints at most five stories:

- When the week already has four or more stories that also have a discussion question, the pack uses the same selection as Good News Friday. A story with a summary and no question is left out.
- When the week has fewer than four of those stories, a story that has a summary and no question can be added. Nothing else is added.

The page prints the photo, the place, `kidSummary`, the first two `kidQuestions` when they exist, and `kidWord` / `kidDefinition` only when both are already on the story. The at-home kindness line uses that week's kindness challenge `home` step when one exists. Otherwise it names the sections and places already in the pack and asks for one free kind act at home.

## Word search (`/word-search`)

A week gets a page when it has at least one published kid-friendly story, even if the word list is short.

Words are taken only from those stories:

- `kidWord`, split on spaces when it is a phrase. Hyphens stay in the human label and are left out of the grid.
- The city, or the U.S. state name, when the whole name is one word or hyphenated and at least four letters. `New York` is not split into `York`.
- A category label when it is one clean word, such as Animals or Heroes. `Health & Tech` is skipped.

Words shorter than four letters, or longer than 14, are skipped. A 16-letter place name does not fit a page a child can scan. Function words are skipped, and so are tokens that match the news-break or morning-announcement filters, plus a small deny-list for violence, politics, and slurs. The list is capped at 12 words. Up to four vocabulary words are kept first, then the longest remaining words.

The grid is built in TypeScript at build time. Words run left to right, top to bottom, or on a diagonal that moves to the right. Empty cells are filled with letters. The answer key is closed on screen and prints on the next page.

If a week has fewer than six usable words, the page still renders, says so, and links to `/classroom` and `/kids`. It does not invent words to fill the grid.
