export const CATEGORIES = [
  {
    slug: "heroes",
    label: "Heroes",
    color: "#3E78B2",
    description: "People who showed up for someone else, and kept showing up.",
  },
  {
    slug: "animals",
    label: "Animals",
    color: "#F27A54",
    description: "Rescues, wildlife comebacks, and the humans who care for them.",
  },
  {
    slug: "science",
    label: "Science",
    color: "#2E8B66",
    description: "Careful good news from labs, classrooms, and the field.",
  },
  {
    slug: "community",
    label: "Community",
    color: "#C98612",
    description: "Neighbors, towns, and small decisions that change a life.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategory(slug: string | undefined | null) {
  return CATEGORIES.find((category) => category.slug === slug);
}
