import { z } from "zod";
import { CATEGORIES } from "./categories";
import { getCountry } from "./countries";
import { getStateByCode } from "./states";
import { FIRST_RESPONDER_SLUGS } from "./first-responders";
import { isTag } from "./tags";

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
    country: z
      .string()
      .regex(/^[A-Z]{2}$/, "Use an ISO 3166-1 alpha-2 code")
      .optional()
      .default("US"),
    state: z.string().regex(/^[A-Z]{2}$/, "Use a two-letter USPS code").optional(),
    alsoStates: z.array(z.string().regex(/^[A-Z]{2}$/)).optional().default([]),
    place: z.string().min(2).optional(),
    category: z.enum(categorySlugs),
    tags: z
      .array(
        z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Tags are lowercase kebab-case")
          .min(2)
          .max(40),
      )
      .max(5)
      .optional()
      .default([]),
    firstResponder: z.enum(FIRST_RESPONDER_SLUGS).optional(),
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
    worldPick: z.boolean().optional().default(false),
    kidFriendly: z.boolean().optional().default(false),
    kidSummary: z.string().trim().min(40).max(800).optional(),
    kidQuestions: z
      .array(z.string().trim().min(12).max(200))
      .min(2, "Add 2 or 3 discussion questions")
      .max(3, "Add 2 or 3 discussion questions")
      .optional(),
    cheers: z.number().int().nonnegative().optional().default(0),
    draft: z.boolean().optional().default(false),
    editorApproved: z.boolean(),
    correction: z.string().min(8).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.kidFriendly) {
      if (!data.kidSummary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kidSummary"],
          message: "A classroom story needs a short summary a teacher can read aloud",
        });
      }
      if (!data.kidQuestions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["kidQuestions"],
          message: "A classroom story needs 2 or 3 discussion questions",
        });
      }
    } else if (data.kidSummary || data.kidQuestions?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["kidFriendly"],
        message: "Set kidFriendly: true when you add a kid summary or discussion questions",
      });
    }
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
    if (!getCountry(data.country)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country"],
        message: `Unknown country code ${data.country}`,
      });
      return;
    }
    if (data.country === "US") {
      if (data.worldPick) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["worldPick"],
          message: "worldPick is only for stories outside the United States",
        });
      }
      if (!getStateByCode(data.state)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["state"],
          message: "US stories need a two-letter USPS state code",
        });
      }
      for (const extra of data.alsoStates) {
        if (!getStateByCode(extra)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["alsoStates"],
            message: `Unknown alsoStates code ${extra}`,
          });
        }
        if (extra === data.state) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["alsoStates"],
            message: `alsoStates should not repeat ${data.state}`,
          });
        }
      }
      return;
    }
    if (data.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "Leave state off stories outside the United States",
      });
    }
    if (data.alsoStates.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["alsoStates"],
        message: "Leave alsoStates off stories outside the United States",
      });
    }
  });

export type StoryFrontmatter = z.infer<typeof storySchema>;
export type HelpLink = z.infer<typeof helpLinkSchema>;
