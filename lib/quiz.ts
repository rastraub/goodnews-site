/**
 * Weekly Good News Quiz.
 *
 * One static page per Monday-start week since launch, built only from story
 * files already in the repo. Nothing here calls an AI model or any other API.
 * The same stories always produce the same questions: order comes from a
 * fixed shuffle of the week id, not from Math.random().
 *
 * Each quiz has 5, 6, or 7 multiple-choice questions. The count is chosen
 * from the Monday date. A week with no way to build 5 questions is skipped.
 *
 * Question kinds, in whatever order the week id shuffles them:
 * - Which state is this story from?
 * - Which town is this story from?
 * - Which country is this story from? (stories outside the United States,
 *   so the answer is not always the same country)
 * - Which section does this headline belong in?
 * - Which headline matches this photo?
 * - Which photo matches this headline?
 *
 * Wrong answers are facts from other stories. Same-week stories are used
 * first, then the rest of the published archive, so a short week can still
 * borrow plausible choices. A headline that already states the answer is
 * skipped. For a state question, a story's other states (alsoStates) are
 * not offered as wrong answers, because those places are also in the report.
 *
 * Kid mode is a second set, built the same way from stories with
 * kidFriendly set. Every choice in that set comes from a classroom story.
 * The set is kept only when it reaches 5 questions.
 */
import { getCategory } from "./categories";
import { countryName } from "./countries";
import { absoluteUrl, publishedIso } from "./seo";
import { stateName } from "./states";
import { getPublishedStories } from "./stories";
import {
  MAX_PRERENDERED_WEEKS,
  addDays,
  formatWeekRange,
  launchWeekStart,
  mountainDay,
  parseIsoDate,
  weekStart,
} from "./weeks";
import { siteConfig } from "@/site.config";

export const MIN_QUIZ_QUESTIONS = 5;
export const MAX_QUIZ_QUESTIONS = 7;

export const QUIZ_KINDS = ["state", "city", "country", "category", "headline", "photo"] as const;
export type QuizKind = (typeof QUIZ_KINDS)[number];

export type QuizSource = {
  slug: string;
  title: string;
  shortTitle?: string;
  date: string;
  city: string;
  country: string;
  state?: string;
  alsoStates?: string[];
  category: string;
  image: string;
  imageAlt: string;
  kidFriendly?: boolean;
  draft?: boolean;
};

export type QuizChoice = {
  id: string;
  label: string;
  image?: string;
  imageAlt?: string;
  sourceSlug: string;
};

export type QuizQuestion = {
  id: string;
  kind: QuizKind;
  prompt: string;
  image?: string;
  imageAlt?: string;
  choices: QuizChoice[];
  answerId: string;
  storySlug: string;
  storyTitle: string;
  storyPath: string;
  kidFriendly: boolean;
};

export type WeekQuiz = {
  start: string;
  end: string;
  path: string;
  inProgress: boolean;
  rangeLabel: string;
  title: string;
  heading: string;
  description: string;
  questions: QuizQuestion[];
  kidQuestions: QuizQuestion[];
  storyCount: number;
  kidStoryCount: number;
  image: string;
  imageAlt: string;
  latest: string;
};

type Fact = {
  key: string;
  label: string;
  image?: string;
  imageAlt?: string;
  sourceSlug: string;
};

const LETTERS = ["a", "b", "c", "d"];

function mix(seed: number): number {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x | 0;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const copy = items.slice();
  let state = seed || 1;
  for (let index = copy.length - 1; index > 0; index -= 1) {
    state = mix(state);
    const swap = (state >>> 0) % (index + 1);
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy;
}

function mentions(text: string, answer: string): boolean {
  const needle = answer.trim();
  if (needle.length < 2) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function headline(story: QuizSource): string {
  const short = story.shortTitle?.trim();
  if (short && short.length >= 8) return short;
  return story.title.trim();
}

function storyFact(story: QuizSource, kind: QuizKind): Fact | undefined {
  if (kind === "state") {
    if (story.country !== "US" || !story.state) return undefined;
    const label = stateName(story.state);
    if (!label) return undefined;
    return { key: `state:${story.state}`, label, sourceSlug: story.slug };
  }
  if (kind === "city") {
    const label = story.city.trim();
    if (label.length < 2) return undefined;
    return { key: `city:${label.toLowerCase()}`, label, sourceSlug: story.slug };
  }
  if (kind === "country") {
    const label = countryName(story.country);
    if (!label) return undefined;
    return { key: `country:${story.country}`, label, sourceSlug: story.slug };
  }
  if (kind === "category") {
    const category = getCategory(story.category);
    if (!category) return undefined;
    return { key: `category:${category.slug}`, label: category.label, sourceSlug: story.slug };
  }
  if (kind === "headline") {
    const label = headline(story);
    if (label.length < 8) return undefined;
    return { key: `headline:${label.toLowerCase()}`, label, sourceSlug: story.slug };
  }
  const alt = story.imageAlt.trim();
  if (!story.image || alt.length < 8) return undefined;
  return {
    key: `photo:${story.image}`,
    label: alt,
    image: story.image,
    imageAlt: alt,
    sourceSlug: story.slug,
  };
}

/** Label a story would contribute for this question kind. Used to check that choices come from stories. */
export function quizChoiceLabel(story: QuizSource, kind: QuizKind): string | undefined {
  return storyFact(story, kind)?.label;
}

function promptFor(kind: QuizKind, clue: string): string {
  if (kind === "state") return `Which state is “${clue}” from?`;
  if (kind === "city") return `Which town is “${clue}” from?`;
  if (kind === "country") return `Which country is “${clue}” from?`;
  if (kind === "category") return `Which section does “${clue}” belong in?`;
  if (kind === "headline") return "Which headline matches this photo?";
  return `Which photo matches “${clue}”?`;
}

function questionTarget(seedKey: string): number {
  const span = MAX_QUIZ_QUESTIONS - MIN_QUIZ_QUESTIONS + 1;
  return MIN_QUIZ_QUESTIONS + (hashString(`${seedKey}:count`) % span);
}

function kindCap(kind: QuizKind, relaxed: boolean): number {
  if (relaxed) return QUIZ_KINDS.length;
  if (kind === "headline" || kind === "photo") return 1;
  return 2;
}

function makeQuestion(story: QuizSource, kind: QuizKind, pool: QuizSource[], seedKey: string): Omit<QuizQuestion, "id"> | undefined {
  if (kind === "country" && story.country === "US") return undefined;
  const correct = storyFact(story, kind);
  if (!correct) return undefined;
  const clue = headline(story);
  if (kind !== "headline" && mentions(clue, correct.label)) return undefined;

  const banned = new Set<string>([correct.key]);
  if (kind === "state") {
    for (const extra of story.alsoStates ?? []) banned.add(`state:${extra}`);
  }

  const picked: Fact[] = [];
  const seen = new Set<string>([correct.key, correct.label.toLowerCase()]);
  for (const other of pool) {
    if (picked.length === 3) break;
    const fact = storyFact(other, kind);
    if (!fact || banned.has(fact.key) || seen.has(fact.key) || seen.has(fact.label.toLowerCase())) continue;
    if (mentions(clue, fact.label) && kind !== "headline") continue;
    picked.push(fact);
    seen.add(fact.key);
    seen.add(fact.label.toLowerCase());
  }
  if (picked.length < 3) return undefined;

  const ordered = shuffle([correct, ...picked], hashString(`${seedKey}:${story.slug}:${kind}:choices`));
  if (new Set(ordered.map((fact) => fact.label.toLowerCase())).size !== 4) return undefined;
  const choices: QuizChoice[] = ordered.map((fact, index) => ({
    id: LETTERS[index] ?? "a",
    label: fact.label,
    ...(fact.image ? { image: fact.image, imageAlt: fact.imageAlt } : {}),
    sourceSlug: fact.sourceSlug,
  }));
  const answer = choices.find((choice) => choice.sourceSlug === story.slug && choice.label === correct.label);
  if (!answer) return undefined;

  return {
    kind,
    prompt: promptFor(kind, clue),
    ...(kind === "headline" ? { image: story.image, imageAlt: story.imageAlt.trim() } : {}),
    choices,
    answerId: answer.id,
    storySlug: story.slug,
    storyTitle: story.title,
    storyPath: `/story/${story.slug}`,
    kidFriendly: Boolean(story.kidFriendly),
  };
}

function selectQuestions(
  candidates: Omit<QuizQuestion, "id">[],
  target: number,
  perStory: number,
  relaxed: boolean,
): Omit<QuizQuestion, "id">[] {
  const picked: Omit<QuizQuestion, "id">[] = [];
  const storyCounts = new Map<string, number>();
  const kindCounts = new Map<QuizKind, number>();
  for (const candidate of candidates) {
    if (picked.length >= target) break;
    const storiesUsed = storyCounts.get(candidate.storySlug) ?? 0;
    const kindsUsed = kindCounts.get(candidate.kind) ?? 0;
    if (storiesUsed >= perStory || kindsUsed >= kindCap(candidate.kind, relaxed)) continue;
    picked.push(candidate);
    storyCounts.set(candidate.storySlug, storiesUsed + 1);
    kindCounts.set(candidate.kind, kindsUsed + 1);
  }
  return picked;
}

export function buildQuestionSet(weekStories: QuizSource[], corpus: QuizSource[], seedKey: string): QuizQuestion[] | undefined {
  const ready = weekStories.filter((story) => !story.draft && parseIsoDate(story.date));
  if (!ready.length) return undefined;
  const kinds = shuffle([...QUIZ_KINDS], hashString(`${seedKey}:kinds`));
  const storyOrder = shuffle(
    ready.slice().sort((a, b) => a.slug.localeCompare(b.slug)),
    hashString(`${seedKey}:stories`),
  );
  const candidates: Omit<QuizQuestion, "id">[] = [];
  for (const story of storyOrder) {
    const others = ready.filter((item) => item.slug !== story.slug);
    const rest = corpus.filter((item) => !item.draft && item.slug !== story.slug && !ready.some((weekStory) => weekStory.slug === item.slug));
    const pool = [
      ...shuffle(others, hashString(`${seedKey}:${story.slug}:week`)),
      ...shuffle(rest, hashString(`${seedKey}:${story.slug}:rest`)),
    ];
    for (const kind of kinds) {
      const question = makeQuestion(story, kind, pool, seedKey);
      if (question) candidates.push(question);
    }
  }

  const target = questionTarget(seedKey);
  let best: Omit<QuizQuestion, "id">[] = [];
  const attempts = [
    { perStory: 1, relaxed: false },
    { perStory: 2, relaxed: false },
    { perStory: 2, relaxed: true },
    { perStory: QUIZ_KINDS.length, relaxed: true },
  ];
  for (const attempt of attempts) {
    const picked = selectQuestions(candidates, target, attempt.perStory, attempt.relaxed);
    if (picked.length > best.length) best = picked;
    if (best.length >= target) break;
  }
  if (best.length < MIN_QUIZ_QUESTIONS) return undefined;
  return best.map((question, index) => ({ ...question, id: `q${index + 1}` }));
}

function quizDescription(options: {
  count: number;
  stories: number;
  rangeLabel: string;
  inProgress: boolean;
  kid: boolean;
}): string {
  const when = options.inProgress ? `so far for ${options.rangeLabel}` : options.rangeLabel;
  const kid = options.kid ? " Kid mode keeps the questions to classroom stories." : "";
  return `${options.count} multiple-choice questions from ${options.stories} verified stories, ${when}. Play on the page, share a score without spoilers, or print a copy for class.${kid} No account and no tracking.`;
}

export function buildQuizzes<T extends QuizSource>(stories: T[], today = mountainDay()): WeekQuiz[] {
  const launch = launchWeekStart();
  const current = weekStart(today);
  const published = stories.filter((story) => !story.draft && parseIsoDate(story.date));
  const buckets = new Map<string, T[]>();
  for (const story of published) {
    const start = weekStart(story.date);
    if (start < launch || start > current) continue;
    const list = buckets.get(start);
    if (list) list.push(story);
    else buckets.set(start, [story]);
  }

  const quizzes: WeekQuiz[] = [];
  for (const [start, group] of buckets) {
    const questions = buildQuestionSet(group, published, start);
    if (!questions) continue;
    const kids = group.filter((story) => story.kidFriendly);
    const kidPool = published.filter((story) => story.kidFriendly);
    const kidQuestions = kids.length ? buildQuestionSet(kids, kidPool, `${start}:kid`) ?? [] : [];
    const usableKids = kidQuestions.length >= MIN_QUIZ_QUESTIONS ? kidQuestions : [];
    const end = addDays(start, 6);
    const inProgress = start === current;
    const rangeLabel = formatWeekRange(start, end);
    const photo = group.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)))[0];
    const latest = group.reduce((max, story) => (story.date > max ? story.date : max), group[0]?.date ?? start);
    quizzes.push({
      start,
      end,
      path: `/quiz/${start}`,
      inProgress,
      rangeLabel,
      title: inProgress ? `This week's Good News Quiz: ${rangeLabel}` : `Good News Quiz: ${rangeLabel}`,
      heading: inProgress ? `This week's Good News Quiz, so far: ${rangeLabel}.` : `Good News Quiz: ${rangeLabel}.`,
      description: quizDescription({
        count: questions.length,
        stories: group.length,
        rangeLabel,
        inProgress,
        kid: usableKids.length > 0,
      }),
      questions,
      kidQuestions: usableKids,
      storyCount: group.length,
      kidStoryCount: kids.length,
      image: photo?.image ?? "",
      imageAlt: photo?.imageAlt ?? "",
      latest,
    });
  }
  quizzes.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return quizzes;
}

let cache: WeekQuiz[] | null = null;

export function getPublishedQuizzes(): WeekQuiz[] {
  if (process.env.NODE_ENV === "production" && cache) return cache;
  const quizzes = buildQuizzes(getPublishedStories());
  cache = quizzes;
  return quizzes;
}

/** Newest quizzes win if the archive ever passes the week cap. */
export function quizzesToPrerender(quizzes = getPublishedQuizzes()): WeekQuiz[] {
  if (quizzes.length <= MAX_PRERENDERED_WEEKS) return quizzes;
  return quizzes
    .slice()
    .sort((a, b) => (a.start < b.start ? 1 : -1))
    .slice(0, MAX_PRERENDERED_WEEKS)
    .reverse();
}

export function getQuiz(start: string, quizzes = quizzesToPrerender()): WeekQuiz | undefined {
  return quizzes.find((quiz) => quiz.start === start);
}

export function latestQuiz(quizzes = quizzesToPrerender()): WeekQuiz | undefined {
  return quizzes[quizzes.length - 1];
}

function answerText(question: QuizQuestion): string {
  return question.choices.find((choice) => choice.id === question.answerId)?.label ?? "";
}

export function quizJsonLd(quiz: WeekQuiz) {
  const crumbs = [
    { name: "Today", path: "/" },
    { name: "Good News Quiz", path: "/quiz" },
    { name: quiz.rangeLabel, path: quiz.path },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Quiz", "LearningResource"],
        "@id": absoluteUrl(`${quiz.path}#quiz`),
        name: quiz.title,
        headline: quiz.heading,
        description: quiz.description,
        url: absoluteUrl(quiz.path),
        inLanguage: siteConfig.locale,
        isAccessibleForFree: true,
        educationalUse: "assessment",
        learningResourceType: "quiz",
        teaches: "This week's verified good news",
        audience: {
          "@type": "EducationalAudience",
          educationalRole: "student",
        },
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        datePublished: publishedIso(quiz.start),
        dateModified: publishedIso(quiz.latest),
        image: quiz.image ? absoluteUrl(quiz.image) : undefined,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        hasPart: quiz.questions.map((question, index) => ({
          "@type": "Question",
          position: index + 1,
          eduQuestionType: "Multiple choice",
          name: question.prompt,
          text:
            question.kind === "headline" && question.imageAlt
              ? `${question.prompt} Photo: ${question.imageAlt}`
              : question.prompt,
          acceptedAnswer: {
            "@type": "Answer",
            text: answerText(question),
          },
          suggestedAnswer: question.choices
            .filter((choice) => choice.id !== question.answerId)
            .map((choice) => ({ "@type": "Answer", text: choice.label })),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        })),
      },
    ],
  };
}

export function quizIndexJsonLd(quizzes: WeekQuiz[], description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["CollectionPage", "LearningResource"],
        name: "Good News Quiz",
        description,
        url: absoluteUrl("/quiz"),
        inLanguage: siteConfig.locale,
        isAccessibleForFree: true,
        educationalUse: "assessment",
        learningResourceType: "quiz",
        author: {
          "@type": "Organization",
          name: siteConfig.editor.name,
          url: absoluteUrl("/about#masthead"),
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: quizzes.length,
          itemListElement: quizzes
            .slice()
            .reverse()
            .map((quiz, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: quiz.title,
              url: absoluteUrl(quiz.path),
            })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Today", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Good News Quiz", item: absoluteUrl("/quiz") },
        ],
      },
    ],
  };
}
