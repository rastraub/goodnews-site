/**
 * Text prepared for the browser's speech synthesis. No audio is generated here.
 * The reader hears the headline, dek, and body, or a classroom summary.
 * Captions, credits, and how-to-help links are never included because they are
 * not passed in.
 */

export type ListenSegment = {
  id: string;
  text: string;
};

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** Link labels stay. URLs and markdown link syntax do not. */
export function spokenText(value: string): string {
  return value.replace(LINK, "$1").replace(/\s+/g, " ").trim();
}

export function spokenParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n{2,}/)
    .map((block) => spokenText(block))
    .filter(Boolean);
}

/**
 * Some browsers stop an utterance after about fifteen seconds.
 * Short chunks finish, and each one can highlight its paragraph.
 */
export function chunkSpeech(text: string, limit = 180): string[] {
  const normalized = spokenText(text);
  if (!normalized) return [];
  if (normalized.length <= limit) return [normalized];

  const sentences = normalized.match(/[^.!?]+[.!?]+(?:["'”’)\]]+)?|[^.!?]+$/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";

  function push(piece: string) {
    const trimmed = piece.trim();
    if (trimmed) chunks.push(trimmed);
  }

  function append(piece: string) {
    if (!piece) return;
    const next = current ? `${current} ${piece}` : piece;
    if (next.length <= limit) {
      current = next;
      return;
    }
    if (current) push(current);
    if (piece.length <= limit) {
      current = piece;
      return;
    }
    let line = "";
    for (const word of piece.split(" ")) {
      if (!word) continue;
      const joined = line ? `${line} ${word}` : word;
      if (line && joined.length > limit) {
        push(line);
        line = word;
      } else {
        line = joined;
      }
    }
    current = line;
  }

  for (const sentence of sentences) append(sentence.trim());
  if (current) push(current);
  return chunks;
}

export function storyListenSegments(story: { title: string; dek: string; body: string }): ListenSegment[] {
  const segments: ListenSegment[] = [];
  const title = spokenText(story.title);
  const dek = spokenText(story.dek);
  if (title) segments.push({ id: "speak-title", text: title });
  if (dek) segments.push({ id: "speak-dek", text: dek });
  for (const [index, text] of spokenParagraphs(story.body).entries()) {
    segments.push({ id: `speak-p-${index}`, text });
  }
  return segments;
}

/** Headline, then the classroom summary. The dek and the full body are left out. */
export function kidListenSegments(story: { title: string; kidSummary?: string }): ListenSegment[] {
  const summary = story.kidSummary ? spokenText(story.kidSummary) : "";
  if (!summary) return [];
  const segments: ListenSegment[] = [];
  const title = spokenText(story.title);
  if (title) segments.push({ id: "speak-title", text: title });
  segments.push({ id: "speak-kid", text: summary });
  return segments;
}

export function listenCardId(slug: string): string {
  return `listen-${slug}`;
}

/** Listed classroom stories, in order. A story without a summary is skipped. */
export function kidListSegments(stories: { slug: string; title: string; kidSummary?: string }[]): ListenSegment[] {
  const segments: ListenSegment[] = [];
  for (const story of stories) {
    const summary = story.kidSummary ? spokenText(story.kidSummary) : "";
    if (!summary) continue;
    const id = listenCardId(story.slug);
    const title = spokenText(story.title);
    if (title) segments.push({ id, text: title });
    segments.push({ id, text: summary });
  }
  return segments;
}

export const LISTEN_RATES = [0.8, 1, 1.2] as const;
export type ListenRate = (typeof LISTEN_RATES)[number];

export function parseListenRate(value: string | null | undefined): ListenRate {
  const rate = Number(value);
  return (LISTEN_RATES as readonly number[]).includes(rate) ? (rate as ListenRate) : 1;
}

export type VoiceChoice = {
  voiceURI: string;
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
};

function languageTag(lang: string): string {
  return lang.toLowerCase().replace(/_/g, "-");
}

function voiceScore(voice: VoiceChoice): number {
  const lang = languageTag(voice.lang);
  let score = 0;
  if (lang.startsWith("en-us")) score += 50;
  else if (lang.startsWith("en")) score += 20;
  if (voice.localService) score += 10;
  if (voice.default && lang.startsWith("en")) score += 4;
  const name = voice.name.toLowerCase();
  if (/natural|premium|enhanced|samantha|aria|jenny|google us english/.test(name)) score += 8;
  if (/compact|espeak|zarvox|bad news|bahh|bells|boing|whisper|trinoids|superstar/.test(name)) score -= 40;
  return score;
}

export function preferredVoice<T extends VoiceChoice>(voices: T[], savedURI?: string | null): T | undefined {
  if (savedURI) {
    const saved = voices.find((voice) => voice.voiceURI === savedURI);
    if (saved) return saved;
  }
  return voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))[0];
}

/** A short list. English voices win when the device has any. */
export function voiceMenu<T extends VoiceChoice>(voices: T[], limit = 12): T[] {
  const ranked = voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
  const english = ranked.filter((voice) => languageTag(voice.lang).startsWith("en"));
  const pool = english.length ? english : ranked;
  const seen = new Set<string>();
  const menu: T[] = [];
  for (const voice of pool) {
    if (!voice.voiceURI || seen.has(voice.voiceURI)) continue;
    seen.add(voice.voiceURI);
    menu.push(voice);
    if (menu.length >= limit) break;
  }
  return menu;
}

export function assertListenText(): void {
  const linked = spokenText("See [the report](https://example.com/story) today.");
  if (linked !== "See the report today.") {
    throw new Error("Spoken text should keep link labels and drop URLs.");
  }
  const paragraphs = spokenParagraphs("First paragraph.\n\nSecond paragraph.");
  if (paragraphs.length !== 2 || paragraphs[1] !== "Second paragraph.") {
    throw new Error("Spoken paragraphs should follow blank lines.");
  }
  const story = storyListenSegments({
    title: "Neighbors shared a library",
    dek: "A short dek.",
    body: "One paragraph about the library.\n\nAnother paragraph about the books.",
  });
  if (story.map((segment) => segment.id).join(",") !== "speak-title,speak-dek,speak-p-0,speak-p-1") {
    throw new Error("A story should be read as headline, dek, then body paragraphs.");
  }
  if (story.some((segment) => /caption|how to help|credit/i.test(segment.text))) {
    throw new Error("Listen text should be limited to the headline, dek, and body.");
  }
  const kid = kidListenSegments({ title: "Neighbors shared a library", kidSummary: "A class can read this aloud." });
  if (kid.map((segment) => segment.id).join(",") !== "speak-title,speak-kid" || kid.some((segment) => segment.text === "A short dek.")) {
    throw new Error("The kid version should read the headline and the classroom summary.");
  }
  if (kidListenSegments({ title: "No summary" }).length !== 0) {
    throw new Error("A story without a kid summary has no kid version.");
  }
  const list = kidListSegments([
    { slug: "one", title: "First", kidSummary: "Summary one." },
    { slug: "two", title: "Second" },
    { slug: "three", title: "Third", kidSummary: "Summary three." },
  ]);
  if (list.map((segment) => `${segment.id}:${segment.text}`).join("|") !== "listen-one:First|listen-one:Summary one.|listen-three:Third|listen-three:Summary three.") {
    throw new Error("Read all should speak listed kid summaries in order and skip the rest.");
  }
  const chunks = chunkSpeech(`${"A long sentence about a library. ".repeat(20)}`);
  if (chunks.length < 2 || chunks.some((chunk) => chunk.length > 200)) {
    throw new Error("Long read-aloud text should be split into short chunks.");
  }
  if (parseListenRate("0.8") !== 0.8 || parseListenRate("1.2") !== 1.2 || parseListenRate("1.5") !== 1 || parseListenRate(null) !== 1) {
    throw new Error("Reading speed should stay on 0.8, 1, or 1.2.");
  }
  const voices = [
    { voiceURI: "espeak", name: "English Compact", lang: "en", localService: true },
    { voiceURI: "samantha", name: "Samantha", lang: "en-US", localService: true },
    { voiceURI: "fr", name: "Amelie", lang: "fr-FR", localService: true, default: true },
  ];
  if (preferredVoice(voices)?.voiceURI !== "samantha") {
    throw new Error("The default voice should prefer an en-US voice.");
  }
  if (preferredVoice(voices, "fr")?.voiceURI !== "fr") {
    throw new Error("A saved voice should win when it is installed.");
  }
  if (preferredVoice(voices, "missing")?.voiceURI !== "samantha") {
    throw new Error("A missing saved voice should fall back to an en-US voice.");
  }
  const menu = voiceMenu(voices);
  if (menu.some((voice) => voice.lang.startsWith("fr")) || menu[0]?.voiceURI !== "samantha") {
    throw new Error("The voice menu should list English voices, with en-US first.");
  }
}
