/**
 * Evergreen observances for /calendar.
 *
 * Add a row only when the date is real and you can state the rule.
 * Fixed dates use month and day. Floating dates use a weekday rule.
 * Leave a date out when the host announces it fresh each year and no
 * standing rule is published. No elections, partisan dates, or observances
 * whose main point is a religious dispute.
 *
 * tags: slugs from lib/tags.ts. They match archive stories.
 * keywords: extra phrases matched in the title and deck, not the body.
 * kidFriendly: shows a marker. Every row still needs a classroom line.
 * takePart: free actions. No fee, no student email, no trip taken alone.
 * infoUrl: optional https page from the organization that keeps the date.
 * hubs: ids from CALENDAR_HUBS in lib/calendar-path.ts.
 */

export type WeekdayName = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export type ObservanceRule =
  | { type: "fixed"; month: number; day: number; endMonth?: number; endDay?: number }
  | { type: "nthWeekday"; month: number; weekday: WeekdayName; n: 1 | 2 | 3 | 4 | 5; days?: number }
  | { type: "lastWeekday"; month: number; weekday: WeekdayName }
  | { type: "nthWeekdayOffset"; month: number; weekday: WeekdayName; n: 1 | 2 | 3 | 4 | 5; offset: number; days?: number };

export type ObservanceRecord = {
  slug: string;
  name: string;
  description: string;
  rule: ObservanceRule;
  tags: string[];
  keywords?: string[];
  kidFriendly: boolean;
  classroom: string;
  takePart: string[];
  infoUrl?: string;
  infoLabel?: string;
  hubs?: string[];
  storyFilter?: "first-responders";
};

const UN_LIST = "https://www.un.org/en/observances/list-days-weeks";
const UN_LABEL = "United Nations observances";

export const OBSERVANCES: ObservanceRecord[] = [
  {
    slug: "veterans-day",
    name: "Veterans Day",
    description: "Veterans Day is November 11 in the United States, a day to thank people who served in the military.",
    rule: { type: "fixed", month: 11, day: 11 },
    tags: ["veterans"],
    keywords: ["veteran", "veterans", "honor flight"],
    kidFriendly: true,
    classroom:
      "Ask the class to write a short thank-you that starts with “Dear Veteran” and names one kind of help, such as a welcome home. A teacher mails the cards. Do not collect a student's full name or address.",
    takePart: [
      "Write a thank-you note a teacher, librarian, or family adult can pass along.",
      "Read one veterans story from the archive and name the specific kindness in it.",
      "Skip politics. Thank the service, not a party or a policy.",
    ],
    infoUrl: "https://www.va.gov/opa/vetsday/",
    infoLabel: "U.S. Department of Veterans Affairs",
    hubs: ["veterans"],
  },
  {
    slug: "world-kindness-day",
    name: "World Kindness Day",
    description: "November 13 is World Kindness Day, a date for one deliberate kind act.",
    rule: { type: "fixed", month: 11, day: 13 },
    tags: ["kindness", "neighbors"],
    keywords: ["kindness"],
    kidFriendly: true,
    classroom:
      "Ask each student for one free kindness the same day, such as a thank-you sentence or stacking chairs. Do not collect photos, full names, or email addresses.",
    takePart: [
      "Hold a door, leave a short kind note, or let someone go ahead of you.",
      "Thank one person for a specific help they gave.",
      "Read a kindness story from the archive out loud. No purchase is required.",
    ],
    hubs: ["world-kindness", "kindness"],
  },
  {
    slug: "america-recycles-day",
    name: "America Recycles Day",
    description: "America Recycles Day is November 15, a day to sort recycling and make less trash.",
    rule: { type: "fixed", month: 11, day: 15 },
    tags: ["recycling", "cleanups"],
    keywords: ["recycling", "recycled"],
    kidFriendly: true,
    classroom:
      "Sort a classroom bin into paper and bottles the school already recycles. Do not send students to a road or a dumpster alone.",
    takePart: [
      "Rinse one bottle and put it in the bin your building already uses.",
      "Pick up litter in a park or schoolyard with another person.",
      "Choose a reusable bottle for the day instead of buying a new one.",
    ],
  },
  {
    slug: "world-childrens-day",
    name: "World Children's Day",
    description: "November 20 is the United Nations World Children's Day.",
    rule: { type: "fixed", month: 11, day: 20 },
    tags: ["kids", "schools"],
    keywords: ["students", "classroom"],
    kidFriendly: true,
    classroom:
      "Let students name one thing that helps children learn, such as a library book or a safe playground. Do not ask them to share private family details.",
    takePart: [
      "Read a classroom story from the kids section with a child.",
      "Leave a children's book in a Little Free Library if one is already on your block.",
      "Thank a librarian, a coach, or a teacher for a specific help.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "national-adoption-day",
    name: "National Adoption Day",
    description: "National Adoption Day is the Saturday before Thanksgiving in the United States, a day about permanent families for children in foster care.",
    rule: { type: "nthWeekdayOffset", month: 11, weekday: "thursday", n: 4, offset: -5 },
    tags: ["kids"],
    keywords: ["foster care", "foster youth", "adoption day"],
    kidFriendly: false,
    classroom:
      "A teacher can ask what a kind welcome looks like, using a story from the archive. Do not ask a student whether they are adopted or to describe a family.",
    takePart: [
      "Read one archive story about a child who was helped, and notice what adults actually did.",
      "Donate outgrown children's books or coats to a drive that is already organized. Money is not required.",
      "If you want to help a foster program, use a link already printed on a story. Do not contact a child directly.",
    ],
  },
  {
    slug: "thanksgiving",
    name: "Thanksgiving",
    description: "Thanksgiving in the United States falls on the fourth Thursday of November.",
    rule: { type: "nthWeekday", month: 11, weekday: "thursday", n: 4 },
    tags: ["community-meals", "food-banks", "kindness"],
    keywords: ["thanksgiving", "harvest"],
    kidFriendly: true,
    classroom:
      "Ask each student to name one specific thing they appreciate, such as a lunch or a person who helped. A feast at home is not required.",
    takePart: [
      "Tell someone one specific reason you are glad they are around.",
      "Add a can or a box you already have to a food drive. Buying more is optional.",
      "Read a gratitude story from 50 States of Thanks.",
    ],
    hubs: ["thanks"],
  },
  {
    slug: "giving-tuesday",
    name: "GivingTuesday",
    description: "GivingTuesday is the Tuesday after Thanksgiving, a day to give time, goods, or attention.",
    rule: { type: "nthWeekdayOffset", month: 11, weekday: "thursday", n: 4, offset: 5 },
    tags: ["volunteers", "kindness", "food-banks"],
    keywords: ["volunteer", "food drive"],
    kidFriendly: true,
    classroom:
      "Pick one free class project, such as notes for a food pantry or a litter pickup on school grounds. Do not ask students for money or an email address.",
    takePart: [
      "Give an hour to a cleanup, a pantry, or a neighbor who needs a hand.",
      "Drop off goods a drive is already asking for, such as food or coats.",
      "Use the state guide for a way to help that is already checked in a story.",
    ],
    infoUrl: "https://www.givingtuesday.org/",
    infoLabel: "GivingTuesday",
    hubs: ["giving"],
  },
  {
    slug: "international-day-of-persons-with-disabilities",
    name: "International Day of Persons with Disabilities",
    description: "December 3 is the United Nations day for including people with disabilities.",
    rule: { type: "fixed", month: 12, day: 3 },
    tags: ["inclusion", "accessibility"],
    keywords: ["accessible", "wheelchair", "inclusion"],
    kidFriendly: true,
    classroom:
      "Look at one real place in school, such as a door, a desk, or a playground, and ask whether more people could use it. Do not ask anyone to name a disability.",
    takePart: [
      "Hold a door and give people time. Do not grab a wheelchair or a cane unless someone asks.",
      "Read an archive story about a playground, a trail, or a classroom that made room.",
      "If you suggest a fix at school, tell a teacher. Do not block a ramp or a path to make a point.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-volunteer-day",
    name: "International Volunteer Day",
    description: "December 5 is the United Nations International Volunteer Day.",
    rule: { type: "fixed", month: 12, day: 5 },
    tags: ["volunteers"],
    keywords: ["volunteer", "volunteers"],
    kidFriendly: true,
    classroom:
      "List jobs a student can do at school for free, such as sharpening pencils or wiping a table. The work stays on campus with a teacher.",
    takePart: [
      "Spend part of a free hour on a task a pantry, a library, or a neighbor already needs.",
      "Thank a volunteer for one job you saw them do.",
      "Read a volunteer story and copy the kind of help, not a dangerous stunt.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-mountain-day",
    name: "International Mountain Day",
    description: "December 11 is the United Nations International Mountain Day.",
    rule: { type: "fixed", month: 12, day: 11 },
    tags: ["parks", "trails"],
    keywords: ["mountain", "trail", "hiking"],
    kidFriendly: true,
    classroom:
      "Find mountains or hills on a map the class already has, then name one way to be a careful guest, such as staying on a path. A field trip is not required.",
    takePart: [
      "Walk a local path or park with another person and stay on the trail.",
      "Carry out any trash you brought.",
      "Read a parks story and notice who keeps the place open.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-braille-day",
    name: "World Braille Day",
    description: "January 4 is the United Nations day for braille, a way of reading by touch.",
    rule: { type: "fixed", month: 1, day: 4 },
    tags: ["inclusion", "accessibility", "literacy"],
    keywords: ["braille"],
    kidFriendly: true,
    classroom:
      "If the school already has a braille sign, a teacher can let students feel it. Do not invent the dots. Talk about reading by touch, then return to a book the class can already use.",
    takePart: [
      "Notice a braille sign in a public building and leave it in place for the person who needs it.",
      "Offer to read a short menu or sign aloud if someone asks. Do not assume they want help.",
      "Read a story about access and name the change that helped.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-day-of-education",
    name: "International Day of Education",
    description: "January 24 is the United Nations International Day of Education.",
    rule: { type: "fixed", month: 1, day: 24 },
    tags: ["teachers", "students", "schools", "literacy"],
    keywords: ["school", "students", "library"],
    kidFriendly: true,
    classroom:
      "Ask what a student can teach the class in two minutes, such as a fact from a library book. No supplies to buy.",
    takePart: [
      "Return a library book on time so the next person can read it.",
      "Thank a teacher for one lesson you can still use.",
      "Read an archive story about a school, a library, or students who built something.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "valentines-day",
    name: "Valentine's Day",
    description: "February 14 can be a day for friendly notes. A gift is not required.",
    rule: { type: "fixed", month: 2, day: 14 },
    tags: ["kindness"],
    keywords: ["valentine"],
    kidFriendly: true,
    classroom:
      "Make a free note for every student, or for none, so no one is left out. Do not require candy, money, or a valentine for a crush.",
    takePart: [
      "Write a friendly note to a classmate, a neighbor, or a family adult.",
      "Include the whole class if you bring notes to school.",
      "Skip a gift. Kind words are enough.",
    ],
    hubs: ["kindness"],
  },
  {
    slug: "random-acts-of-kindness-week",
    name: "Random Acts of Kindness Week",
    description: "Random Acts of Kindness Week is February 14 through February 20. The main day is February 17.",
    rule: { type: "fixed", month: 2, day: 14, endMonth: 2, endDay: 20 },
    tags: ["kindness", "volunteers"],
    keywords: ["kindness"],
    kidFriendly: true,
    classroom:
      "Pick one free kindness for each school day that week, such as a compliment, a held door, or a tidy table. Post the list in the room. Do not record students.",
    takePart: [
      "Do one unexpected kindness a day during the week. Keep it small and free.",
      "Let the person enjoy it. You do not have to post it.",
      "Use the kindness challenge if you want a prompt that is already on the site.",
    ],
    infoUrl: "https://www.randomactsofkindness.org/rak-week",
    infoLabel: "Random Acts of Kindness Foundation",
    hubs: ["kindness"],
  },
  {
    slug: "random-acts-of-kindness-day",
    name: "Random Acts of Kindness Day",
    description: "February 17 is Random Acts of Kindness Day, for a small kindness someone did not expect.",
    rule: { type: "fixed", month: 2, day: 17 },
    tags: ["kindness"],
    keywords: ["kindness"],
    kidFriendly: true,
    classroom:
      "Each student plans one free act, such as sharing a pencil or saying thank you, and may tell the class afterward without naming a private story.",
    takePart: [
      "Pay a specific compliment that is true.",
      "Help with a chore at home or a job at school.",
      "Pass on a library book you finished.",
    ],
    infoUrl: "https://www.randomactsofkindness.org/rak-day",
    infoLabel: "Random Acts of Kindness Foundation",
    hubs: ["kindness"],
  },
  {
    slug: "world-wildlife-day",
    name: "World Wildlife Day",
    description: "March 3 is World Wildlife Day, a United Nations date for wild animals and the places they live.",
    rule: { type: "fixed", month: 3, day: 3 },
    tags: ["wildlife-conservation", "animal-rescue"],
    keywords: ["wildlife", "habitat"],
    kidFriendly: true,
    classroom:
      "Name one local animal and one thing it needs, such as a tree or clean water. Do not handle a wild animal or collect one.",
    takePart: [
      "Watch wildlife from a distance and leave nests and dens alone.",
      "Keep a park clean so animals are not eating trash.",
      "Read a conservation story and notice the limit the report already states.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-day-of-mathematics",
    name: "International Day of Mathematics",
    description: "March 14 is the UNESCO International Day of Mathematics. Many classrooms also mark it as Pi Day.",
    rule: { type: "fixed", month: 3, day: 14 },
    tags: ["stem", "students"],
    keywords: ["math", "mathematics"],
    kidFriendly: true,
    classroom:
      "Measure a round object the class already owns and talk about why the distance around is a bit more than three times the width. No purchase is required.",
    takePart: [
      "Count something useful, such as books to return or chairs that need stacking.",
      "Show a younger student one math idea you can explain in a minute.",
      "Read a story about students who built or measured something.",
    ],
    infoUrl: "https://www.unesco.org/en/days/mathematics",
    infoLabel: "UNESCO",
  },
  {
    slug: "international-day-of-happiness",
    name: "International Day of Happiness",
    description: "March 20 is the United Nations International Day of Happiness.",
    rule: { type: "fixed", month: 3, day: 20 },
    tags: ["kindness", "neighbors"],
    keywords: ["kindness"],
    kidFriendly: true,
    classroom:
      "Ask for one small thing that made the day better, such as a joke or a sunny window. Do not grade anyone's mood or ask about private problems.",
    takePart: [
      "Share a kind sentence with someone who has been quiet.",
      "Take a short walk with a friend if you both want to.",
      "Read one upbeat archive story out loud.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-day-of-forests",
    name: "International Day of Forests",
    description: "March 21 is the United Nations International Day of Forests.",
    rule: { type: "fixed", month: 3, day: 21 },
    tags: ["trees", "parks"],
    keywords: ["tree", "trees", "forest"],
    kidFriendly: true,
    classroom:
      "Visit one tree on the school grounds, or a photo of one, and list what it gives, such as shade. Planting a tree is optional and needs a teacher's permission.",
    takePart: [
      "Learn the name of one tree you walk past.",
      "Water a young tree only if you know it needs water and you are allowed to.",
      "Read a story about a planting, a park, or a grove.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-poetry-day",
    name: "World Poetry Day",
    description: "March 21 is UNESCO World Poetry Day.",
    rule: { type: "fixed", month: 3, day: 21 },
    tags: ["literacy", "libraries", "art"],
    keywords: ["poem", "poetry", "poet"],
    kidFriendly: true,
    classroom:
      "Write a four-line poem about a kind thing someone did. Read it aloud only if the writer wants to. No contest fee.",
    takePart: [
      "Read a short poem from a library book.",
      "Copy one line you like into a notebook, with the writer's name if the book gives it.",
      "Leave a poem in a Little Free Library if you wrote it yourself.",
    ],
    infoUrl: "https://www.unesco.org/en/days/poetry",
    infoLabel: "UNESCO",
  },
  {
    slug: "world-water-day",
    name: "World Water Day",
    description: "March 22 is the United Nations World Water Day.",
    rule: { type: "fixed", month: 3, day: 22 },
    tags: ["rivers", "cleanups"],
    keywords: ["river", "stream", "clean water"],
    kidFriendly: true,
    classroom:
      "Turn off the tap while soaping hands, then talk about one stream or lake the class knows. Do not drink from a stream.",
    takePart: [
      "Fix a dripping tap you are allowed to touch, or tell an adult about it.",
      "Join a supervised shore or river cleanup if one is already planned.",
      "Read a story about a river, a fish return, or a cleanup.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-autism-awareness-day",
    name: "World Autism Awareness Day",
    description: "April 2 is the United Nations day for including autistic people.",
    rule: { type: "fixed", month: 4, day: 2 },
    tags: ["inclusion"],
    keywords: ["autism", "autistic"],
    kidFriendly: true,
    classroom:
      "Talk about how a game or a classroom can include someone who likes quiet or a steady routine. Do not ask anyone to say whether they are autistic.",
    takePart: [
      "Offer a quiet seat and a clear plan for the next step.",
      "Ask before you touch someone's things or change a plan they were counting on.",
      "Read an inclusion story and copy a practical change, such as a calmer corner.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-health-day",
    name: "World Health Day",
    description: "April 7 is World Health Day, a date for everyday health habits. It is not medical advice.",
    rule: { type: "fixed", month: 4, day: 7 },
    tags: ["public-health"],
    keywords: ["clinic", "health"],
    kidFriendly: true,
    classroom:
      "Practice handwashing and write a thank-you card for the school nurse. Do not share medical details or skip care a doctor already asked for.",
    takePart: [
      "Wash your hands, drink water, and sleep. Those are the free parts.",
      "Thank a nurse or a clinic worker for the job, not for private patient stories.",
      "Read a public-health story and keep the limits the report already states.",
    ],
    infoUrl: "https://www.who.int/campaigns/world-health-day",
    infoLabel: "World Health Organization",
  },
  {
    slug: "national-pet-day",
    name: "National Pet Day",
    description: "National Pet Day is April 11 in the United States, a day to appreciate pets and the people who care for them.",
    rule: { type: "fixed", month: 4, day: 11 },
    tags: ["dogs", "cats", "pet-adoption"],
    keywords: ["pet", "puppy", "kitten"],
    kidFriendly: true,
    classroom:
      "Draw a pet or a shelter animal from a photo the teacher provides. Do not bring animals to class. Do not share a home address.",
    takePart: [
      "Refill a water bowl and give a pet the walk or the quiet it already needs.",
      "Share a shelter's adopt-or-foster post only if you are an adult and the shelter asked.",
      "Read a story about a reunion, a foster home, or an adoption.",
    ],
  },
  {
    slug: "national-volunteer-week",
    name: "National Volunteer Week",
    description: "National Volunteer Week in the United States is the seven days that begin on the third Sunday of April.",
    rule: { type: "nthWeekday", month: 4, weekday: "sunday", n: 3, days: 7 },
    tags: ["volunteers"],
    keywords: ["volunteer", "volunteers"],
    kidFriendly: true,
    classroom:
      "Pick one on-campus job for the week, such as delivering attendance folders or weeding a school garden with a teacher. Off-campus work needs an adult the school already trusts.",
    takePart: [
      "Show up for a shift you already promised, or offer one hour to a group that posted a need.",
      "Thank a volunteer by naming the job, not with a gift you had to buy.",
      "Read a volunteer story and try a smaller version of the same help.",
    ],
    infoUrl: "https://www.pointsoflight.org/events/",
    infoLabel: "Points of Light",
  },
  {
    slug: "earth-day",
    name: "Earth Day",
    description: "April 22 is Earth Day. The United Nations marks the same date as International Mother Earth Day.",
    rule: { type: "fixed", month: 4, day: 22 },
    tags: ["trees", "parks", "cleanups", "wildlife-conservation", "recycling"],
    keywords: ["earth day", "planting"],
    kidFriendly: true,
    classroom:
      "Do one campus job: pick up litter, sort recycling, or learn the name of a schoolyard tree. Gloves help. Do not send students into a street.",
    takePart: [
      "Pick up trash in a park or a schoolyard with another person.",
      "Skip one disposable bottle or bag you would have used today.",
      "Read an archive story about a cleanup, a planting, or a park.",
    ],
    infoUrl: "https://www.earthday.org/",
    infoLabel: "Earthday.org",
  },
  {
    slug: "world-book-and-copyright-day",
    name: "World Book and Copyright Day",
    description: "April 23 is UNESCO World Book and Copyright Day. A March book day used in the United Kingdom is a different observance.",
    rule: { type: "fixed", month: 4, day: 23 },
    tags: ["literacy", "libraries", "little-free-libraries"],
    keywords: ["library", "reading"],
    kidFriendly: true,
    classroom:
      "Each student recommends one library book in a single sentence. Swap books the school already owns. Do not require a purchase.",
    takePart: [
      "Borrow a book, or return one so someone else can borrow it.",
      "Read aloud for ten minutes with a child or a classmate.",
      "Leave a book you own in a Little Free Library and take one only if you will read it.",
    ],
    infoUrl: "https://www.unesco.org/en/days/world-book-and-copyright-day",
    infoLabel: "UNESCO",
  },
  {
    slug: "arbor-day",
    name: "Arbor Day",
    description: "National Arbor Day in the United States is the last Friday of April, a day for trees.",
    rule: { type: "lastWeekday", month: 4, weekday: "friday" },
    tags: ["trees"],
    keywords: ["tree", "trees", "planting"],
    kidFriendly: true,
    classroom:
      "Sketch a tree on the school grounds and label the trunk, leaves, and shade. Planting needs permission from the school and a spot that already allows it.",
    takePart: [
      "Learn one tree's name and how much water a young tree near you is supposed to get.",
      "Mulch or water a tree only when the owner or the city says it needs it.",
      "Read a story about a planting or an orchard.",
    ],
    infoUrl: "https://www.arborday.org/",
    infoLabel: "Arbor Day Foundation",
  },
  {
    slug: "be-kind-to-animals-week",
    name: "Be Kind to Animals Week",
    description: "Be Kind to Animals Week is the first Sunday-through-Saturday week of May in the United States.",
    rule: { type: "nthWeekday", month: 5, weekday: "sunday", n: 1, days: 7 },
    tags: ["animal-rescue", "pet-adoption", "dogs", "cats"],
    keywords: ["shelter", "foster"],
    kidFriendly: true,
    classroom:
      "Make posters about gentle handling: quiet voices, ask before you pet, and leave wildlife alone. Do not bring an animal to school for the lesson.",
    takePart: [
      "Give a pet fresh water and the exercise or rest it already needs.",
      "If you foster or adopt, use a shelter's own page. Do not take an animal from the street without a plan.",
      "Read a rescue story and notice who called for help.",
    ],
    infoUrl: "https://www.americanhumane.org/education/be-kind-to-animals-week/",
    infoLabel: "American Humane Society",
  },
  {
    slug: "teacher-appreciation-week",
    name: "Teacher Appreciation Week",
    description: "Teacher Appreciation Week in the United States is the first full school week of May, Monday through Friday.",
    rule: { type: "nthWeekday", month: 5, weekday: "monday", n: 1, days: 5 },
    tags: ["teachers", "schools"],
    keywords: ["teacher", "teachers"],
    kidFriendly: true,
    classroom:
      "Students write a specific thank-you: one lesson, one habit, or one hard day the teacher stayed for. No gift, no email, and no collection of money.",
    takePart: [
      "Write a note that names a real help, not a generic compliment.",
      "Offer a chore at school, such as wiping boards or stacking books.",
      "Read a story about a teacher and what the town actually did.",
    ],
    infoUrl: "https://www.nea.org/TAW",
    infoLabel: "National Education Association",
  },
  {
    slug: "national-nurses-week",
    name: "National Nurses Week",
    description: "National Nurses Week in the United States runs from May 6 through May 12.",
    rule: { type: "fixed", month: 5, day: 6, endMonth: 5, endDay: 12 },
    tags: ["public-health"],
    keywords: ["nurse", "nurses"],
    kidFriendly: true,
    classroom:
      "Write thank-you notes for the school nurse or a clinic. Do not include a student's health details, and do not stage an emergency.",
    takePart: [
      "Thank a nurse for the job. Keep other people's medical stories private.",
      "Wash your hands and follow the health rule the school already posted.",
      "Read a story about care in a community clinic and keep the limits in the report.",
    ],
    infoUrl: "https://www.nursingworld.org/education-events/national-nurses-week/history/",
    infoLabel: "American Nurses Association",
  },
  {
    slug: "mothers-day",
    name: "Mother's Day",
    description: "Mother's Day in the United States is the second Sunday of May.",
    rule: { type: "nthWeekday", month: 5, weekday: "sunday", n: 2 },
    tags: ["kindness", "kids"],
    keywords: ["mother", "mom"],
    kidFriendly: true,
    classroom:
      "Make a card for any adult who takes care of people, including a teacher or a neighbor. Do not require a card for a mother, and do not collect money.",
    takePart: [
      "Write a note or do a chore for someone who looks after you.",
      "A phone call is enough if a visit is hard. Do not travel alone.",
      "If the day is sad, it is fine to skip it and read a kind story instead.",
    ],
  },
  {
    slug: "international-day-of-families",
    name: "International Day of Families",
    description: "May 15 is the United Nations International Day of Families.",
    rule: { type: "fixed", month: 5, day: 15 },
    tags: ["kindness", "kids", "neighbors"],
    keywords: ["family"],
    kidFriendly: true,
    classroom:
      "Draw people who help you. They can be relatives, neighbors, or teachers. Do not require a student to name a parent or explain who lives at home.",
    takePart: [
      "Eat a meal with someone, or set the table if you are eating alone with a book.",
      "Call a relative only with a parent's permission and a phone the family already uses.",
      "Read a story about neighbors who acted like family for a day.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-bee-day",
    name: "World Bee Day",
    description: "May 20 is World Bee Day, a United Nations date for bees and other pollinators.",
    rule: { type: "fixed", month: 5, day: 20 },
    tags: ["pollinators"],
    keywords: ["bee", "bees", "pollinator", "monarch"],
    kidFriendly: true,
    classroom:
      "Look for flowers the school already has and talk about why bees need them. Do not catch a bee or disturb a hive.",
    takePart: [
      "Leave dandelions or clover in a corner of a yard if you are allowed to.",
      "Put out a shallow water dish with pebbles so insects can drink without drowning, and change the water.",
      "Read a pollinator story before you plant anything new.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-day-for-biological-diversity",
    name: "International Day for Biological Diversity",
    description: "May 22 is the United Nations International Day for Biological Diversity.",
    rule: { type: "fixed", month: 5, day: 22 },
    tags: ["wildlife-conservation", "parks"],
    keywords: ["habitat", "species", "wildlife"],
    kidFriendly: true,
    classroom:
      "Name one plant and one animal that share a park, a garden, or a schoolyard. A worksheet from a library book is enough.",
    takePart: [
      "Stay on the path in a park so nests and plants stay put.",
      "Learn one species that lives near you and what it eats.",
      "Read a conservation story and keep the numbers as the source stated them.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "global-day-of-parents",
    name: "Global Day of Parents",
    description: "June 1 is the United Nations Global Day of Parents.",
    rule: { type: "fixed", month: 6, day: 1 },
    tags: ["kindness", "kids"],
    keywords: ["parent"],
    kidFriendly: true,
    classroom:
      "Write a thank-you to any adult who helps raise children, including guardians, grandparents, and teachers. Do not require a parent to be the subject.",
    takePart: [
      "Do one chore without being asked.",
      "Say thank you for a specific job, such as a ride or a packed lunch.",
      "If a parent is far away, a drawing is enough. Do not post a child's photo.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-bicycle-day",
    name: "World Bicycle Day",
    description: "June 3 is the United Nations World Bicycle Day.",
    rule: { type: "fixed", month: 6, day: 3 },
    tags: ["bikes"],
    keywords: ["bike", "bicycle"],
    kidFriendly: true,
    classroom:
      "Review the helmet and the stop-and-look rule the school already teaches. A ride happens only with the school's usual permission. No one has to own a bike.",
    takePart: [
      "Check brakes and a helmet before a ride you were already going to take.",
      "Walk a bike on the sidewalk where riding is not allowed.",
      "Read a story about bikes that were given, fixed, or adapted.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-environment-day",
    name: "World Environment Day",
    description: "June 5 is the United Nations World Environment Day.",
    rule: { type: "fixed", month: 6, day: 5 },
    tags: ["cleanups", "recycling", "trees", "parks"],
    keywords: ["cleanup", "planting"],
    kidFriendly: true,
    classroom:
      "Pick up litter on school grounds for fifteen minutes with gloves and a teacher. Sort what the school can actually recycle.",
    takePart: [
      "Collect trash you can carry safely, with another person nearby.",
      "Turn off lights in an empty room.",
      "Read a story about a cleanup, a park, or a tree planting.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "national-trails-day",
    name: "National Trails Day",
    description: "National Trails Day in the United States is the first Saturday of June.",
    rule: { type: "nthWeekday", month: 6, weekday: "saturday", n: 1 },
    tags: ["trails", "parks"],
    keywords: ["trail", "path"],
    kidFriendly: true,
    classroom:
      "Trace a local path on a map, including a school track. Talk about staying on the path and bringing water. A hike off campus needs the school's usual permission.",
    takePart: [
      "Walk a trail or a park path with another person.",
      "Pack out trash, including scraps you did not drop.",
      "Read a trails story before you try a path you do not know.",
    ],
  },
  {
    slug: "world-oceans-day",
    name: "World Oceans Day",
    description: "June 8 is the United Nations World Oceans Day.",
    rule: { type: "fixed", month: 6, day: 8 },
    tags: ["sea-turtles", "wildlife-conservation", "cleanups"],
    keywords: ["ocean", "sea turtle", "beach"],
    kidFriendly: true,
    classroom:
      "List trash that hurts ocean animals, then pick up the same kinds of trash in the schoolyard. Do not require a trip to a beach.",
    takePart: [
      "Skip a plastic bag you do not need.",
      "If you are already at a shore, carry out trash and leave animals and shells where they are if the local rule says so.",
      "Read a sea-turtle or beach story from the archive.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-day-of-play",
    name: "International Day of Play",
    description: "June 11 is the United Nations International Day of Play.",
    rule: { type: "fixed", month: 6, day: 11 },
    tags: ["kids", "playgrounds"],
    keywords: ["playground", "recess"],
    kidFriendly: true,
    classroom:
      "Use recess or a game the school already owns. Make one rule that lets more people play. Do not require a new toy or a trip.",
    takePart: [
      "Invite someone who is sitting out, and accept a no.",
      "Put equipment back where the next class can find it.",
      "Read a playground story and notice who the new design was for.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "fathers-day",
    name: "Father's Day",
    description: "Father's Day in the United States is the third Sunday of June.",
    rule: { type: "nthWeekday", month: 6, weekday: "sunday", n: 3 },
    tags: ["kindness", "kids"],
    keywords: ["father", "dad"],
    kidFriendly: true,
    classroom:
      "Offer a card for any caring adult, not only a father. Students who want to skip the card can write a thank-you to a coach, a neighbor, or a teacher instead.",
    takePart: [
      "Write a note or do a chore. A gift is not required.",
      "A call is enough. Do not travel alone to deliver it.",
      "If the day is hard, read a kind story and leave the day quiet.",
    ],
  },
  {
    slug: "international-day-of-friendship",
    name: "International Day of Friendship",
    description: "July 30 is the United Nations International Day of Friendship.",
    rule: { type: "fixed", month: 7, day: 30 },
    tags: ["kindness", "kids", "neighbors"],
    keywords: ["friend", "friends"],
    kidFriendly: true,
    classroom:
      "Students write one kind sentence to a classmate, including someone they do not usually sit with. The teacher can deliver notes so no one is left out.",
    takePart: [
      "Invite someone to join a game or a walk you are already taking.",
      "Apologize for one small thing if you owe it, in person and briefly.",
      "Read a kindness story together.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
    hubs: ["kindness"],
  },
  {
    slug: "international-youth-day",
    name: "International Youth Day",
    description: "August 12 is the United Nations International Youth Day.",
    rule: { type: "fixed", month: 8, day: 12 },
    tags: ["students", "kids"],
    keywords: ["students", "teen"],
    kidFriendly: true,
    classroom:
      "Ask students what they would fix at school with time and no budget, then do the smallest version, such as labeling a shelf. Do not collect contact information.",
    takePart: [
      "Finish one helpful job you already know how to do.",
      "Teach a skill, such as a knot or a math step, to someone younger.",
      "Read a story about students who planted, built, or collected something.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-humanitarian-day",
    name: "World Humanitarian Day",
    description: "August 19 is the United Nations day for people who help when a community is in trouble.",
    rule: { type: "fixed", month: 8, day: 19 },
    tags: ["volunteers", "kindness"],
    keywords: ["volunteer", "relief"],
    kidFriendly: false,
    classroom:
      "Name three local jobs that help people, such as a librarian, a nurse, and a volunteer. Skip stories about violence. Do not ask students to recount an emergency.",
    takePart: [
      "Give time or goods to a drive that is already open. Money is not required.",
      "Check on a neighbor with a knock or a note if you already know them.",
      "Read a volunteer story and copy a safe, ordinary task.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "international-day-of-charity",
    name: "International Day of Charity",
    description: "September 5 is the United Nations International Day of Charity. Time and donated goods count. Money is not required.",
    rule: { type: "fixed", month: 9, day: 5 },
    tags: ["kindness", "volunteers", "food-banks"],
    keywords: ["donate", "pantry", "drive"],
    kidFriendly: true,
    classroom:
      "Collect pencils, books, or food the school was already going to gather. Do not ask students for cash or for a family's financial details.",
    takePart: [
      "Give an hour, a book you have finished, or food you can spare.",
      "Thank the person running the drive.",
      "Use a how-to-help link that is already on a checked story.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
    hubs: ["giving"],
  },
  {
    slug: "international-literacy-day",
    name: "International Literacy Day",
    description: "September 8 is UNESCO International Literacy Day.",
    rule: { type: "fixed", month: 9, day: 8 },
    tags: ["literacy", "libraries"],
    keywords: ["reading", "library", "books"],
    kidFriendly: true,
    classroom:
      "Pair readers for ten minutes with books the classroom already has. A student who is learning can listen. Do not post reading scores.",
    takePart: [
      "Read with someone for ten minutes.",
      "Return or donate a book you are done with.",
      "Read a literacy story and notice where the books came from.",
    ],
    infoUrl: "https://www.unesco.org/en/days/literacy",
    infoLabel: "UNESCO",
  },
  {
    slug: "national-grandparents-day",
    name: "National Grandparents Day",
    description: "National Grandparents Day in the United States is the Sunday after Labor Day.",
    rule: { type: "nthWeekdayOffset", month: 9, weekday: "monday", n: 1, offset: 6 },
    tags: ["seniors", "kindness"],
    keywords: ["grandparent", "grandparents"],
    kidFriendly: true,
    classroom:
      "Write a kind note to an older person, or to a senior center a teacher can mail as a class. Do not collect home addresses from children.",
    takePart: [
      "Call or write an older relative or neighbor. A child uses a phone only with an adult.",
      "Offer a practical help, such as carrying groceries, if the person wants it.",
      "Read a story about seniors and the neighbor who showed up.",
    ],
  },
  {
    slug: "international-day-of-sign-languages",
    name: "International Day of Sign Languages",
    description: "September 23 is the United Nations International Day of Sign Languages.",
    rule: { type: "fixed", month: 9, day: 23 },
    tags: ["inclusion", "accessibility"],
    keywords: ["sign language"],
    kidFriendly: true,
    classroom:
      "Practice a wave, a nod, and a short written note, three ways to be kind without much talking. Do not ask a student to perform a disability. A fluent signer can teach one greeting if the school invites them.",
    takePart: [
      "Face the person you are talking with and keep your hands away from your mouth.",
      "Write a short note if speech is hard in a noisy place.",
      "Read an inclusion story about a classroom or a public place that made room.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "national-public-lands-day",
    name: "National Public Lands Day",
    description: "National Public Lands Day is the fourth Saturday of September in the United States, a day for parks and other public land.",
    rule: { type: "nthWeekday", month: 9, weekday: "saturday", n: 4 },
    tags: ["parks", "trails", "cleanups"],
    keywords: ["park", "trail"],
    kidFriendly: true,
    classroom:
      "Study a nearby park on a map and list one way to help, such as staying on paths or picking up trash with a teacher. A visit uses the school's usual trip rules.",
    takePart: [
      "Visit a park you can reach safely, with another person.",
      "Join a cleanup only if the park has posted one, and bring water.",
      "Read a parks story and see what neighbors planted or repaired.",
    ],
  },
  {
    slug: "world-gratitude-day",
    name: "World Gratitude Day",
    description: "September 21 is widely observed as World Gratitude Day, a day to name something specific you appreciate.",
    rule: { type: "fixed", month: 9, day: 21 },
    tags: ["kindness", "neighbors"],
    keywords: ["thank", "thanks", "gratitude"],
    kidFriendly: true,
    classroom:
      "Each student finishes the sentence “I appreciate ___ because ___” about a person, a place, or a meal. Sharing is optional.",
    takePart: [
      "Thank someone for a specific act, not a vague compliment.",
      "Write three lines in a notebook if you would rather not say them aloud.",
      "Read a story from 50 States of Thanks.",
    ],
    hubs: ["thanks"],
  },
  {
    slug: "international-day-of-peace",
    name: "International Day of Peace",
    description: "September 21 is the United Nations International Day of Peace.",
    rule: { type: "fixed", month: 9, day: 21 },
    tags: ["kindness"],
    keywords: ["peace"],
    kidFriendly: true,
    classroom:
      "Write one sentence about a kind act that makes a classroom calmer. Leave out wars, parties, and arguments about the news.",
    takePart: [
      "Speak more quietly in a shared room for part of the day.",
      "Fix a small conflict with an apology or a turn taken fairly.",
      "Read a kindness story instead of arguing about a headline.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "national-good-neighbor-day",
    name: "National Good Neighbor Day",
    description: "September 28 is National Good Neighbor Day in the United States, a day for a small kindness close to home.",
    rule: { type: "fixed", month: 9, day: 28 },
    tags: ["neighbors", "kindness"],
    keywords: ["neighbor", "neighbors"],
    kidFriendly: true,
    classroom:
      "Plan one neighborly act a family can do together, such as a note or bringing in bins. Students do not go to a stranger's door alone.",
    takePart: [
      "Say hello to a neighbor you already know.",
      "Offer a practical help, such as carrying a package to the door, and stop if they decline.",
      "Read a neighbors story and try a smaller version.",
    ],
    infoUrl: "https://www.nationalgoodneighborday.org/",
    infoLabel: "National Good Neighbor Day",
    hubs: ["neighbor"],
  },
  {
    slug: "international-day-of-older-persons",
    name: "International Day of Older Persons",
    description: "October 1 is the United Nations International Day of Older Persons.",
    rule: { type: "fixed", month: 10, day: 1 },
    tags: ["seniors"],
    keywords: ["senior", "older"],
    kidFriendly: true,
    classroom:
      "Students write a short note a teacher can give to a senior center or a grandfriend the school already visits. Do not ask for ages or home addresses.",
    takePart: [
      "Offer a seat, a slower pace, or help with a bag if the person wants it.",
      "Call an older relative with a phone the family already uses.",
      "Read a seniors story and notice the practical help, such as a ride or a repair.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "world-smile-day",
    name: "World Smile Day",
    description: "World Smile Day is the first Friday of October, a day for a small free kindness.",
    rule: { type: "nthWeekday", month: 10, weekday: "friday", n: 1 },
    tags: ["kindness"],
    keywords: ["kindness", "smile"],
    kidFriendly: true,
    classroom:
      "Each student gives one sincere compliment or a help, such as saving a seat. A smile is welcome. No one has to smile on command.",
    takePart: [
      "Greet someone by name if you know it.",
      "Let a person with fewer items go ahead of you.",
      "Leave a kind note where a classmate will find it.",
    ],
    hubs: ["kindness"],
  },
  {
    slug: "world-animal-day",
    name: "World Animal Day",
    description: "October 4 is World Animal Day, a date for the welfare of pets, farm animals, and wildlife.",
    rule: { type: "fixed", month: 10, day: 4 },
    tags: ["animal-rescue", "wildlife-conservation", "pet-adoption"],
    keywords: ["animal", "shelter", "wildlife"],
    kidFriendly: true,
    classroom:
      "Sort animals the class knows into pets, farm animals, and wildlife, and name one kind care for each. Do not bring an animal in.",
    takePart: [
      "Care for a pet you already have: water, food, and rest.",
      "Watch wildlife without feeding it people-food.",
      "Read a rescue or conservation story before you share it.",
    ],
    infoUrl: "https://www.worldanimalday.org.uk/",
    infoLabel: "World Animal Day",
  },
  {
    slug: "world-teachers-day",
    name: "World Teachers' Day",
    description: "October 5 is UNESCO World Teachers' Day. The United States also marks a teacher week in May.",
    rule: { type: "fixed", month: 10, day: 5 },
    tags: ["teachers", "schools"],
    keywords: ["teacher", "teachers"],
    kidFriendly: true,
    classroom:
      "Write one sentence a future teacher could use, about a class rule that helps people learn. Thank-you notes are welcome. Gifts and money are not.",
    takePart: [
      "Thank a teacher for a specific lesson.",
      "Help reset the room at the end of class.",
      "Read a teachers story from the archive.",
    ],
    infoUrl: "https://www.unesco.org/en/days/teachers",
    infoLabel: "UNESCO",
  },
  {
    slug: "world-mental-health-day",
    name: "World Mental Health Day",
    description: "October 10 is World Mental Health Day, a date to be kind about how people feel. It is not medical advice.",
    rule: { type: "fixed", month: 10, day: 10 },
    tags: ["kindness", "inclusion"],
    keywords: ["mental health"],
    kidFriendly: false,
    classroom:
      "Ask the class for one kind sentence that is easy to say on a hard day. Do not ask anyone to share a diagnosis, a private problem, or a crisis. A teacher follows the school's usual help process if a student needs an adult.",
    takePart: [
      "Check on a friend with a simple question, and listen.",
      "Take a walk, a breath, or a break if you need one.",
      "If someone may be in danger, tell a trusted adult or local emergency services. Do not try to handle a crisis alone.",
    ],
    infoUrl: "https://www.who.int/campaigns/world-mental-health-day",
    infoLabel: "World Health Organization",
  },
  {
    slug: "world-food-day",
    name: "World Food Day",
    description: "October 16 is the United Nations World Food Day.",
    rule: { type: "fixed", month: 10, day: 16 },
    tags: ["food-banks", "community-meals", "food-rescue"],
    keywords: ["food bank", "pantry", "meal"],
    kidFriendly: true,
    classroom:
      "Talk about where school lunch comes from and one food the class could add to a pantry drive the school already runs. Do not ask who is hungry at home.",
    takePart: [
      "Add a shelf-stable food you can spare to a drive, or help pack if a pantry asks.",
      "Do not waste a meal you already took. Share only food that is still safe.",
      "Read a food-bank or community-meal story and use the help link on that story.",
    ],
    infoUrl: UN_LIST,
    infoLabel: UN_LABEL,
  },
  {
    slug: "make-a-difference-day",
    name: "Make a Difference Day",
    description: "Make a Difference Day is the fourth Saturday of October in the United States, a day for a local volunteer project.",
    rule: { type: "nthWeekday", month: 10, weekday: "saturday", n: 4 },
    tags: ["volunteers", "kindness"],
    keywords: ["volunteer"],
    kidFriendly: true,
    classroom:
      "Choose one project that fits a Saturday morning at school, such as a garden bed or thank-you cards. Families join only through the school's usual sign-up for adults.",
    takePart: [
      "Join a project that has a host, a time, and a safe meeting place.",
      "Bring water and work with other people. Do not go to a site alone.",
      "If nothing is organized, do one neighborhood kindness you can finish in an hour.",
    ],
  },
  {
    slug: "national-first-responders-day",
    name: "National First Responders Day",
    description: "October 28 is National First Responders Day in the United States, a day to thank firefighters, emergency crews, dispatchers, and other responders.",
    rule: { type: "fixed", month: 10, day: 28 },
    tags: ["first-responders", "firefighters", "police", "ems", "search-and-rescue"],
    keywords: ["firefighter", "paramedic", "dispatcher"],
    kidFriendly: true,
    classroom:
      "Write thank-you cards a teacher can drop at a station the school already knows. Practice the real emergency number only as the school already teaches it. Do not stage a fire, a chase, or a medical emergency.",
    takePart: [
      "Thank a responder for the job when they are not on a call.",
      "Learn the emergency number your area uses, and use it only for a real emergency.",
      "Read a rescue story from the First Responders Day page. Leave out anything the story does not show.",
    ],
    infoUrl: "https://www.congress.gov/bill/116th-congress/senate-concurrent-resolution/15",
    infoLabel: "U.S. Congress",
    hubs: ["responders"],
    storyFilter: "first-responders",
  },
];
