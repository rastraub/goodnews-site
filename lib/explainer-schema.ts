import { z } from "zod";
import { helpLinkSchema } from "./story-schema";
import { isTag } from "./tags";

const isoDate = z.preprocess((value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"));

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a story slug");

const keyword = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .transform((value) => value.toLowerCase());

export const explainerSourceSchema = z
  .object({
    label: z.string().trim().min(3).max(120),
    url: z.string().url().refine((url) => url.startsWith("https://"), "Source links must use https"),
  })
  .strict();

export const explainerStepSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    text: z.string().trim().min(20).max(500),
  })
  .strict();

export const explainerSchema = z
  .object({
    title: z.string().trim().min(12).max(90),
    shortTitle: z.string().trim().min(8).max(48),
    dek: z.string().trim().min(40).max(240),
    date: isoDate,
    updated: isoDate.optional(),
    schema: z.enum(["Article", "HowTo"]),
    tags: z.array(z.string().trim()).min(1).max(4),
    keywords: z.array(keyword).min(1).max(12),
    includeStories: z.array(slug).max(8).optional().default([]),
    excludeStories: z.array(slug).max(24).optional().default([]),
    kidSummary: z.string().trim().min(40).max(800),
    safety: z.array(z.string().trim().min(20).max(400)).min(2).max(6),
    howToHelp: z.array(helpLinkSchema).min(1).max(4),
    sources: z.array(explainerSourceSchema).min(1).max(8),
    steps: z.array(explainerStepSchema).min(3).max(7).optional(),
    draft: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seenTags = new Set<string>();
    for (const tag of data.tags) {
      if (!isTag(tag)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tags"],
          message: `Unknown tag ${tag}. Use a tag from lib/tags.ts.`,
        });
      }
      if (seenTags.has(tag)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tags"],
          message: `Duplicate tag ${tag}`,
        });
      }
      seenTags.add(tag);
    }

    const seenKeywords = new Set<string>();
    for (const word of data.keywords) {
      if (seenKeywords.has(word)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["keywords"],
          message: `Duplicate keyword ${word}`,
        });
      }
      seenKeywords.add(word);
    }

    const seenSlugs = new Set<string>();
    for (const storySlug of [...data.includeStories, ...data.excludeStories]) {
      if (seenSlugs.has(storySlug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["includeStories"],
          message: `${storySlug} is listed more than once`,
        });
      }
      seenSlugs.add(storySlug);
    }
    for (const storySlug of data.includeStories) {
      if (data.excludeStories.includes(storySlug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["excludeStories"],
          message: `${storySlug} cannot be both included and excluded`,
        });
      }
    }

    if (data.schema === "HowTo" && !data.steps?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message: "A HowTo explainer needs at least three steps",
      });
    }
    if (data.schema === "Article" && data.steps?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["steps"],
        message: "Steps belong on schema: HowTo. Use Article when the page explains how something works.",
      });
    }

    if (data.updated && data.updated < data.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updated"],
        message: "updated cannot be earlier than date",
      });
    }
  });

export type ExplainerFrontmatter = z.infer<typeof explainerSchema>;
