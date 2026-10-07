import { z } from "zod";
import { CATEGORIES } from "./categories";

const categorySlugs = CATEGORIES.map((category) => category.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

type CategorySlug = (typeof CATEGORIES)[number]["slug"];

const isoDate = z.preprocess((value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"));

export const helpLinkSchema = z
  .object({
    label: z.string().min(3),
    url: z.string().url().refine((url) => url.startsWith("https://"), "Help links must use https"),
    kind: z.enum(["donate", "volunteer", "thank", "learn"]),
  })
  .strict();

export const storySchema = z
  .object({
    title: z.string().min(12),
    shortTitle: z.string().min(8).optional(),
    emphasis: z.string().min(2).optional(),
    dek: z.string().min(20),
    date: isoDate,
    city: z.string().min(1),
    state: z.string().regex(/^[A-Z]{2}$/, "Use a two-letter USPS code"),
    alsoStates: z.array(z.string().regex(/^[A-Z]{2}$/)).optional().default([]),
    place: z.string().min(2).optional(),
    category: z.enum(categorySlugs),
    sourceName: z.string().min(2),
    sourceUrl: z.string().url().refine((url) => url.startsWith("https://"), "Source URL must use https"),
    image: z.string().regex(/^\/images\/.+\.webp$/),
    imageAlt: z.string().min(8),
    imageCaption: z.string().min(8),
    imageCredit: z.string().min(3),
    imageCreditUrl: z.string().url(),
    imageLicense: z.string().min(3),
    imageLicenseUrl: z.string().url(),
    imageTreatment: z.enum(["none", "warm"]).optional().default("none"),
    howToHelp: z.array(helpLinkSchema).min(1),
    featured: z.boolean().optional().default(false),
    top5: z.number().int().min(1).max(5).optional(),
    cheers: z.number().int().nonnegative().optional().default(0),
    draft: z.boolean().optional().default(false),
    editorApproved: z.boolean(),
    correction: z.string().min(8).optional(),
  })
  .strict();

export type StoryFrontmatter = z.infer<typeof storySchema>;
export type HelpLink = z.infer<typeof helpLinkSchema>;
