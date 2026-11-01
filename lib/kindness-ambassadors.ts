/**
 * Kindness Ambassadors shoutouts. Editors add a class by hand to
 * data/kindness-ambassadors.json after a teacher writes in. The public page
 * shows the group, the city and state or country, and the act. It never
 * shows a child's name, a photo, or an email.
 *
 * An empty months array is the starting file. A month with no classes still
 * renders, asks to be the first class featured, and stays out of the sitemap.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  AMBASSADOR_CERTIFICATE_PATH,
  AMBASSADOR_DESCRIPTION,
  AMBASSADOR_TITLE,
  AMBASSADORS_PATH,
  shoutoutsPath,
} from "@/lib/ambassador-tip";
import { absoluteUrl } from "@/lib/seo";
import { formatLongDate, mountainDay } from "@/lib/weeks";
import { siteConfig } from "@/site.config";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const PRIVATE = /@|https?:\/\//i;

const classSchema = z
  .object({
    group: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(60),
    region: z.string().trim().min(2).max(60),
    act: z.string().trim().min(20).max(280),
  })
  .strict();

const monthSchema = z
  .object({
    month: z.string().regex(MONTH),
    classes: z.array(classSchema),
  })
  .strict();

const fileSchema = z
  .object({
    months: z.array(monthSchema),
  })
  .strict();

export type AmbassadorClass = z.infer<typeof classSchema>;
export type AmbassadorMonth = z.infer<typeof monthSchema>;

export type AmbassadorFaq = { question: string; answer: string };

function dataPath(): string {
  return path.join(process.cwd(), "data", "kindness-ambassadors.json");
}

export function currentAmbassadorMonth(today = mountainDay()): string {
  return today.slice(0, 7);
}

export function formatAmbassadorMonth(month: string): string {
  if (!MONTH.test(month)) return month;
  return formatLongDate(`${month}-01`).replace(/ \d+,/, "");
}

export function ambassadorPlace(entry: Pick<AmbassadorClass, "city" | "region">): string {
  return `${entry.city}, ${entry.region}`;
}

/** Problems in an already-shaped file. Schema errors are reported separately. */
export function ambassadorContentProblems(months: readonly AmbassadorMonth[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const month of months) {
    if (seen.has(month.month)) problems.push(`${month.month}: duplicate month`);
    seen.add(month.month);
    month.classes.forEach((entry, index) => {
      const label = `${month.month} class ${index + 1}`;
      const text = `${entry.group} ${entry.city} ${entry.region} ${entry.act}`;
      if (PRIVATE.test(text)) {
        problems.push(`${label}: leave out email addresses and links. Publish the group, the place, and the act only.`);
      }
    });
  }
  return problems;
}

export function readAmbassadorFile(raw: unknown): { months: AmbassadorMonth[] } | { error: string } {
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return { error: details };
  }
  const problems = ambassadorContentProblems(parsed.data.months);
  if (problems.length) return { error: problems.join("; ") };
  return { months: parsed.data.months };
}

export function loadAmbassadorMonths(): AmbassadorMonth[] {
  const file = dataPath();
  if (!fs.existsSync(file)) {
    throw new Error(`Missing Kindness Ambassadors file at ${file}`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not parse JSON";
    throw new Error(`data/kindness-ambassadors.json: ${message}`);
  }
  const read = readAmbassadorFile(raw);
  if ("error" in read) throw new Error(`data/kindness-ambassadors.json: ${read.error}`);
  return read.months;
}

export function classesForMonth(month: string, months = loadAmbassadorMonths()): AmbassadorClass[] {
  return months.find((item) => item.month === month)?.classes ?? [];
}

/** Months an editor has given at least one class. Empty months stay out of the sitemap. */
export function indexableShoutoutMonths(months = loadAmbassadorMonths()): string[] {
  return months.filter((item) => item.classes.length > 0).map((item) => item.month).sort();
}

/** Current month always has a page, plus any month listed in the data file. */
export function shoutoutMonthsToPrerender(today = mountainDay()): string[] {
  const months = new Set(loadAmbassadorMonths().map((item) => item.month));
  months.add(currentAmbassadorMonth(today));
  return [...months].sort();
}

export function ambassadorFaqs(): AmbassadorFaq[] {
  return [
    {
      question: "Is Kindness Ambassadors free?",
      answer: `Yes. It costs nothing. There is no kit to buy and no fee to join. A teacher can read ${siteConfig.name} with a class for free.`,
    },
    {
      question: "How much time does it take?",
      answer:
        "A few minutes a week. The class does one small act of kindness that is free, and a teacher can read one short story aloud. There is no packet to finish and no long project.",
    },
    {
      question: "What about privacy?",
      answer:
        "The signup asks for the first name of the teacher or leader, or the group name, plus the school or group, city, state or country, grade range, and an email. It does not ask for student names or photos of children. Do not send them. A shoutout shows the group name, the city and state or country, and the act. Children's names are not published.",
    },
    {
      question: "How do shoutouts work?",
      answer:
        "A teacher sends what the class did, using the same tip form as any other note. Editors read it and may add the group by hand to that month's shoutouts page. The page shows the group, the place, and the act. If a month has no class yet, the page invites the first one and search engines are asked not to index it.",
    },
    {
      question: "Who can join?",
      answer:
        "K-12 classrooms, school libraries, public libraries, scout troops, youth groups, and homeschool groups. A grown-up sends the note. Students do not sign up on their own.",
    },
  ];
}

function breadcrumb(crumbs: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function ambassadorsJsonLd(faqs: readonly AmbassadorFaq[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebPage", "LearningResource"],
        "@id": `${absoluteUrl(AMBASSADORS_PATH)}#program`,
        name: AMBASSADOR_TITLE,
        description: AMBASSADOR_DESCRIPTION,
        url: absoluteUrl(AMBASSADORS_PATH),
        inLanguage: "en-US",
        isAccessibleForFree: true,
        learningResourceType: "activity",
        educationalUse: "group work",
        educationalLevel: "K-12",
        teaches: "Kindness",
        timeRequired: "PT20M",
        audience: {
          "@type": "EducationalAudience",
          educationalRole: "teacher",
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        provider: {
          "@type": "Organization",
          name: siteConfig.owner.name,
          url: absoluteUrl("/about"),
        },
        isPartOf: { "@id": `${siteConfig.url}/#website` },
      },
      {
        "@type": "FAQPage",
        "@id": `${absoluteUrl(AMBASSADORS_PATH)}#faq`,
        url: absoluteUrl(AMBASSADORS_PATH),
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      breadcrumb([
        { name: "Today", path: "/" },
        { name: AMBASSADOR_TITLE, path: AMBASSADORS_PATH },
      ]),
    ],
  };
}

export function certificateJsonLd() {
  const description =
    "A printable Kindness Ambassador certificate for a class or student group. The class name and date are typed on the page and are not saved.";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${absoluteUrl(AMBASSADOR_CERTIFICATE_PATH)}#certificate`,
        name: "Kindness Ambassador certificate",
        description,
        url: absoluteUrl(AMBASSADOR_CERTIFICATE_PATH),
        inLanguage: "en-US",
        isAccessibleForFree: true,
        learningResourceType: "printable certificate",
        educationalLevel: "K-12",
        audience: {
          "@type": "EducationalAudience",
          educationalRole: "teacher",
        },
        publisher: { "@id": `${siteConfig.url}/#organization` },
        isPartOf: { "@id": `${siteConfig.url}/#website` },
      },
      breadcrumb([
        { name: "Today", path: "/" },
        { name: AMBASSADOR_TITLE, path: AMBASSADORS_PATH },
        { name: "Certificate", path: AMBASSADOR_CERTIFICATE_PATH },
      ]),
    ],
  };
}

export function shoutoutsJsonLd(month: string, classes: readonly AmbassadorClass[]) {
  const path = shoutoutsPath(month);
  const label = formatAmbassadorMonth(month);
  const description = classes.length
    ? `Classroom shoutouts for ${label}. Each note names the group, the place, and the act of kindness.`
    : `No Kindness Ambassador class has been featured for ${label} yet.`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${absoluteUrl(path)}#shoutouts`,
        name: `Kindness Ambassador shoutouts for ${label}`,
        description,
        url: absoluteUrl(path),
        inLanguage: "en-US",
        isAccessibleForFree: true,
        isPartOf: { "@id": `${siteConfig.url}/#website` },
        ...(classes.length
          ? {
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: classes.length,
                itemListElement: classes.map((entry, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: entry.group,
                  description: `${entry.act} ${ambassadorPlace(entry)}.`,
                })),
              },
            }
          : {}),
      },
      breadcrumb([
        { name: "Today", path: "/" },
        { name: AMBASSADOR_TITLE, path: AMBASSADORS_PATH },
        { name: label, path },
      ]),
    ],
  };
}
