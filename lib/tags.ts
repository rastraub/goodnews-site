/**
 * The only tags a story may use. Topic pages, the daily job, and validation
 * all read this list. Add a tag here before you put it on a story.
 * A page appears at /topic/{slug} once three published stories share it.
 */
export const TAGS = [
  {
    slug: "animal-rescue",
    label: "Animal rescue",
    title: "Good news about animal rescue",
    intro: "Rescues, reunions, and the people who get an animal out of trouble and back to safety.",
  },
  {
    slug: "dogs",
    label: "Dogs",
    title: "Good news about dogs",
    intro: "Dogs who were found, fostered, or matched with someone who needed them.",
  },
  {
    slug: "cats",
    label: "Cats",
    title: "Good news about cats",
    intro: "Kittens and community cats, and the shelters and neighbors who look after them.",
  },
  {
    slug: "birds",
    label: "Birds",
    title: "Good news about birds",
    intro: "Nesting seasons, releases, and the people who make room for birds.",
  },
  {
    slug: "horses",
    label: "Horses",
    title: "Good news about horses",
    intro: "Horses at work in the woods, and horses whose calm helps the people around them.",
  },
  {
    slug: "wildlife-conservation",
    label: "Wildlife conservation",
    title: "Good news about wildlife conservation",
    intro: "Species coming back, habitat set aside, and the field work that keeps wild animals wild.",
  },
  {
    slug: "sea-turtles",
    label: "Sea turtles",
    title: "Good news about sea turtles",
    intro: "Nests, hatchlings, and turtles returned to the water after a long recovery.",
  },
  {
    slug: "pet-adoption",
    label: "Pet adoption",
    title: "Good news about pet adoption",
    intro: "Shelters, foster homes, and the day an animal gets a family.",
  },
  {
    slug: "zoos",
    label: "Zoos",
    title: "Good news about zoos",
    intro: "Zoo births, new arrivals, and the care that gets an animal ready for the next step.",
  },
  {
    slug: "parks",
    label: "Parks",
    title: "Good news about parks",
    intro: "Parks opened, replanted, or redesigned with the neighbors who use them.",
  },
  {
    slug: "trees",
    label: "Trees",
    title: "Good news about trees",
    intro: "Plantings, orchards, and groves that neighbors put in the ground.",
  },
  {
    slug: "rivers",
    label: "Rivers",
    title: "Good news about rivers",
    intro: "Cleanups, fish coming home, and streams turned into outdoor classrooms.",
  },
  {
    slug: "community-garden",
    label: "Community gardens",
    title: "Good news about community gardens",
    intro: "Gardens at libraries, schools, and farms where people grow food together.",
  },
  {
    slug: "cleanups",
    label: "Cleanups",
    title: "Good news about cleanups",
    intro: "Volunteers hauling trash, algae, and debris so a shore or a river can breathe.",
  },
  {
    slug: "libraries",
    label: "Libraries",
    title: "Good news about libraries",
    intro: "Libraries that lend books, gear, seeds, and sometimes a meal.",
  },
  {
    slug: "literacy",
    label: "Literacy",
    title: "Good news about literacy",
    intro: "Books in children's hands, reading gains, and the drives that pay for the next book.",
  },
  {
    slug: "little-free-libraries",
    label: "Little Free Libraries",
    title: "Good news about Little Free Libraries",
    intro: "Sidewalk book boxes where anyone can take a book or leave one.",
  },
  {
    slug: "food-banks",
    label: "Food banks",
    title: "Good news about food banks",
    intro: "Food drives, pantry trucks, and groceries neighbors send to people who need them.",
  },
  {
    slug: "community-meals",
    label: "Community meals",
    title: "Good news about community meals",
    intro: "Free suppers, packed meals, and tables where anyone can sit down to eat.",
  },
  {
    slug: "kindness",
    label: "Kindness",
    title: "Good news about kindness",
    intro: "Specific help, given once and on purpose: flowers, shoes, a note, a paid load of laundry.",
  },
  {
    slug: "volunteers",
    label: "Volunteers",
    title: "Good news about volunteers",
    intro: "People who show up with a paintbrush, a hammer, or a free Saturday.",
  },
  {
    slug: "veterans",
    label: "Veterans",
    title: "Good news about veterans",
    intro: "Housing, welcome-home crowds, thank-you notes, and neighbors who show up for people who served.",
  },
  {
    slug: "teachers",
    label: "Teachers",
    title: "Good news about teachers",
    intro: "Teachers honored, housed, and backed by the towns where they work.",
  },
  {
    slug: "students",
    label: "Students",
    title: "Good news about students",
    intro: "Students who built, collected, planted, or studied their way into a real result.",
  },
  {
    slug: "kids",
    label: "Kids",
    title: "Good news about kids",
    intro: "Children who helped someone, made something, or were looked after by the people around them.",
  },
  {
    slug: "inclusion",
    label: "Inclusion",
    title: "Good news about inclusion",
    intro: "Teams, classrooms, and public days that make room for more kinds of people.",
  },
  {
    slug: "playgrounds",
    label: "Playgrounds",
    title: "Good news about playgrounds",
    intro: "Playgrounds built, repaired, and opened so children have somewhere to play.",
  },
  {
    slug: "youth-sports",
    label: "Youth sports",
    title: "Good news about youth sports",
    intro: "Teams, camps, and game days where children get to play.",
  },
  {
    slug: "running",
    label: "Running",
    title: "Good news about running",
    intro: "Races and walks that neighbors turn into a shared morning.",
  },
  {
    slug: "festivals",
    label: "Festivals",
    title: "Good news about festivals",
    intro: "Town festivals, balloon glows, and free days a neighborhood puts on.",
  },
  {
    slug: "music",
    label: "Music",
    title: "Good news about music",
    intro: "Porch concerts, long jams, and instruments put into students' hands.",
  },
  {
    slug: "scholarships",
    label: "Scholarships",
    title: "Good news about scholarships",
    intro: "Tuition help and prize money for a student who is already doing the work.",
  },
  {
    slug: "housing",
    label: "Housing",
    title: "Good news about housing",
    intro: "Homes opened, repaired, or started for people who needed a stable door.",
  },
  {
    slug: "seniors",
    label: "Seniors",
    title: "Good news about seniors",
    intro: "Rides, repairs, and company for older neighbors.",
  },
  {
    slug: "stem",
    label: "STEM",
    title: "Good news about STEM",
    intro: "Students building hardware, judging soil, and using tools a lab would recognize.",
  },
  {
    slug: "space",
    label: "Space",
    title: "Good news about space",
    intro: "Students and scientists working on hardware meant to leave the ground.",
  },
  {
    slug: "medical-research",
    label: "Medical research",
    title: "Good news about medical research",
    intro: "Treatments and devices already helping people, or shown in a human trial, with the limits stated plainly.",
  },
  {
    slug: "public-health",
    label: "Public health",
    title: "Good news about public health",
    intro: "Free clinics, screenings, and community care that reached people on a real day.",
  },
  {
    slug: "service-dogs",
    label: "Service dogs",
    title: "Good news about service dogs",
    intro: "Dogs trained for one person, and the neighbors who helped pay for that training.",
  },
  {
    slug: "therapy-animals",
    label: "Therapy animals",
    title: "Good news about therapy animals",
    intro: "Animals whose job is to sit with people and make a hard place feel calmer.",
  },
  {
    slug: "pollinators",
    label: "Pollinators",
    title: "Good news about pollinators",
    intro: "Monarchs, native flowers, and gardens planted so insects have somewhere to feed.",
  },
  {
    slug: "recycling",
    label: "Recycling",
    title: "Good news about recycling",
    intro: "Plastic, metal, and broken things kept in use instead of thrown away.",
  },
  {
    slug: "trails",
    label: "Trails",
    title: "Good news about trails",
    intro: "Paths for walking, biking, and getting outside without sharing the lane with cars.",
  },
  {
    slug: "home-repairs",
    label: "Home repairs",
    title: "Good news about home repairs",
    intro: "Porches, steps, and roofs fixed at no cost for people who could not hire the work.",
  },
  {
    slug: "toys",
    label: "Toys",
    title: "Good news about toys",
    intro: "Toys, costumes, and stuffed animals given so a child is not left out.",
  },
  {
    slug: "winter-clothes",
    label: "Winter clothes",
    title: "Good news about winter clothes",
    intro: "Coats and warm clothes handed out when the weather turns.",
  },
  {
    slug: "farming",
    label: "Farming",
    title: "Good news about farming",
    intro: "Working farms, soil students, orchards, and land kept in crops.",
  },
  {
    slug: "bikes",
    label: "Bikes",
    title: "Good news about bikes",
    intro: "Bicycles given, adapted, or taught so more people can ride.",
  },
  {
    slug: "schools",
    label: "Schools",
    title: "Good news about schools",
    intro: "Schools opening, coming back after a storm, and making room for the students they have.",
  },
  {
    slug: "neighbors",
    label: "Neighbors",
    title: "Good news about neighbors",
    intro: "The person nearby who noticed, and then did something about it.",
  },
  {
    slug: "art",
    label: "Art",
    title: "Good news about art",
    intro: "Murals, yarn in the trees, painted plows, and other work a town can see.",
  },
  {
    slug: "first-responders",
    label: "First responders",
    title: "Good news about first responders",
    intro: "Firefighters, officers, and rescue crews whose training turned into help on a real call.",
  },
  {
    slug: "cancer-support",
    label: "Cancer support",
    title: "Good news about cancer support",
    intro: "Walks, wigs, fundraisers, and visits for people in treatment and the families beside them.",
  },
  {
    slug: "vision-care",
    label: "Vision care",
    title: "Good news about vision care",
    intro: "Eyeglasses collected and eye care funded so someone can see.",
  },
  {
    slug: "school-lunch",
    label: "School lunch",
    title: "Good news about school lunch",
    intro: "Meals at school, and students who made sure a classmate could eat.",
  },
  {
    slug: "accessibility",
    label: "Accessibility",
    title: "Good news about accessibility",
    intro: "Trails, bikes, playgrounds, and practice trips changed so more people can use them.",
  },
  {
    slug: "indigenous-communities",
    label: "Indigenous communities",
    title: "Good news about Indigenous communities",
    intro: "Schools, restorations, and gatherings led with Indigenous communities.",
  },
  {
    slug: "food-rescue",
    label: "Food rescue",
    title: "Good news about food rescue",
    intro: "Produce and leftover meals kept out of the trash and pointed at someone who will eat them.",
  },
] as const;

export type TagSlug = (typeof TAGS)[number]["slug"];

const bySlug = new Map<string, (typeof TAGS)[number]>(TAGS.map((tag) => [tag.slug, tag]));

export function getTag(slug: string) {
  return bySlug.get(slug);
}

export function isTag(slug: string): slug is TagSlug {
  return bySlug.has(slug);
}
