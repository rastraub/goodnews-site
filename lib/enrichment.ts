/**
 * Backfill for stories that shipped before tags and classroom fields.
 * Keyed by slug. Front matter wins when a story sets the same field.
 * The morning job should put tags and classroom text on new stories directly.
 * It should not edit this file, so a rank rotation cannot collide with it.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import { isTag } from "./tags";

const ENRICHMENT_PATH = path.join(process.cwd(), "data", "story-enrichment.json");

const kidQuestion = z.string().trim().min(12).max(200);

export const enrichmentEntrySchema = z
  .object({
    tags: z.array(z.string()).min(2).max(5),
    kidFriendly: z.literal(true).optional(),
    kidSummary: z.string().trim().min(40).max(800).optional(),
    kidQuestions: z.array(kidQuestion).min(2).max(3).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const tag of data.tags) {
      if (!isTag(tag)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tags"],
          message: `Unknown tag ${tag}. Add it to lib/tags.ts before using it.`,
        });
      }
      if (seen.has(tag)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tags"],
          message: `Duplicate tag ${tag}`,
        });
      }
      seen.add(tag);
    }
    if (data.kidFriendly) {
      if (!data.kidSummary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kidSummary"],
          message: "A classroom backfill needs a read-aloud summary",
        });
      } else {
        const words = data.kidSummary.split(/\s+/).filter(Boolean).length;
        if (words < 60 || words > 110) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["kidSummary"],
            message: `Read-aloud summary should be about 60 to 110 words (this one is ${words})`,
          });
        }
      }
      if (!data.kidQuestions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kidQuestions"],
          message: "A classroom backfill needs 2 or 3 discussion questions",
        });
      }
    } else if (data.kidSummary || data.kidQuestions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kidFriendly"],
        message: "Set kidFriendly: true when the backfill includes classroom text",
      });
    }
  });

export type EnrichmentEntry = z.infer<typeof enrichmentEntrySchema>;

let cache: Record<string, EnrichmentEntry> | null = null;

export function enrichmentPath(): string {
  return ENRICHMENT_PATH;
}

export function loadEnrichment(): Record<string, EnrichmentEntry> {
  if (cache) return cache;
  if (!fs.existsSync(ENRICHMENT_PATH)) {
    throw new Error(`Missing story enrichment file at ${ENRICHMENT_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(ENRICHMENT_PATH, "utf8")) as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Story enrichment must be a JSON object keyed by story slug");
  }
  const errors: string[] = [];
  const entries: Record<string, EnrichmentEntry> = {};
  for (const [slug, value] of Object.entries(raw)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.push(`${slug}: slug must be kebab-case`);
      continue;
    }
    const parsed = enrichmentEntrySchema.safeParse(value);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      errors.push(`${slug}: ${details}`);
      continue;
    }
    entries[slug] = parsed.data;
  }
  if (errors.length) {
    throw new Error(`Story enrichment failed:\n- ${errors.join("\n- ")}`);
  }
  cache = entries;
  return entries;
}

/**
 * Copy tags and classroom fields onto raw front matter only where the story
 * file left them unset. An explicit front-matter value, including tags: [],
 * is left alone.
 */
export function mergeStoryFields(
  front: Record<string, unknown>,
  extra: EnrichmentEntry | undefined,
): Record<string, unknown> {
  if (!extra) return front;
  const merged: Record<string, unknown> = { ...front };
  if (front.tags === undefined) merged.tags = extra.tags;
  const hasClassroom =
    front.kidFriendly !== undefined || front.kidSummary !== undefined || front.kidQuestions !== undefined;
  if (!hasClassroom && extra.kidFriendly) {
    merged.kidFriendly = true;
    merged.kidSummary = extra.kidSummary;
    merged.kidQuestions = extra.kidQuestions;
  }
  return merged;
}

export function applyEnrichment(slug: string, front: Record<string, unknown>): Record<string, unknown> {
  return mergeStoryFields(front, loadEnrichment()[slug]);
}
