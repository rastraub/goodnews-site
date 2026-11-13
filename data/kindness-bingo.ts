/**
 * Kindness Bingo acts for families. About a third name a real archive story.
 * The square links to that story. The act itself stays small enough for a child
 * to do with a grown-up at home. Do not invent a story slug.
 */
export type BingoActDef = {
  id: string;
  text: string;
  storySlug?: string;
};

export const BINGO_ACTS: readonly BingoActDef[] = [
  { id: "thank-mail", text: "Write a thank-you note for a mail carrier" },
  { id: "cook-dinner", text: "Help cook dinner", storySlug: "cedar-rapids-give-birds" },
  { id: "shelter-gift", text: "Set aside a toy or book for a family shelter", storySlug: "woonsocket-christmas-wish" },
  { id: "food-can", text: "Add one can of food to a donation bag", storySlug: "warwick-scouting-food" },
  { id: "read-aloud", text: "Read a picture book aloud to a younger child", storySlug: "takamatsu-library-boat" },
  { id: "write-story", text: "Write a one-page story for someone you love", storySlug: "behchoko-student-authors" },
  { id: "veteran-card", text: "Make a card for a veteran or an older neighbor", storySlug: "powell-veteran-quilts" },
  { id: "set-table", text: "Help set the table for a family meal", storySlug: "glasgow-veterans-breakfast" },
  { id: "nature-walk", text: "Take a short walk and name three living things", storySlug: "hastings-project-rewild" },
  { id: "water-plant", text: "Water a plant or start a seed in a cup", storySlug: "woburn-gardens-for-good" },
  { id: "thank-librarian", text: "Write a thank-you note to a librarian", storySlug: "gumi-dream-libraries" },
  { id: "share-coat", text: "Offer a coat you have outgrown", storySlug: "bismarck-knights-coats" },
  { id: "night-sky", text: "Look at the night sky together for two minutes", storySlug: "te-anau-dark-sky" },
  { id: "thank-driver", text: "Write a thank-you note for a bus driver", storySlug: "post-falls-veteran-drivers" },
  { id: "hold-door", text: "Hold a door open for someone" },
  { id: "good-morning", text: "Say good morning to a neighbor" },
  { id: "fold-laundry", text: "Help fold a basket of laundry" },
  { id: "pick-game", text: "Let someone else pick the game" },
  { id: "share-snack", text: "Share a snack you already have" },
  { id: "lunch-note", text: "Leave a kind note in a lunch bag" },
  { id: "appreciate", text: "Tell a family member one thing you appreciate" },
  { id: "groceries", text: "Help carry groceries inside" },
  { id: "toys-away", text: "Put toys away without being asked" },
  { id: "grandparent", text: "Wave or call a grandparent" },
  { id: "wash-dishes", text: "Help wash the dishes" },
  { id: "fridge-note", text: "Leave a kind note on the fridge" },
  { id: "walk-dog", text: "Offer to walk a family dog with a grown-up" },
  { id: "recycling", text: "Sort the recycling" },
  { id: "kind-joke", text: "Tell a kind joke" },
  { id: "bookmark", text: "Make a bookmark for someone" },
  { id: "sibling-chore", text: "Help a sibling with a chore" },
  { id: "compliment", text: "Compliment someone for trying" },
  { id: "water-bottle", text: "Fill a water bottle for a walk together" },
  { id: "sing", text: "Sing one song with your family" },
  { id: "draw-picture", text: "Draw a picture and give it away" },
  { id: "litter", text: "Pick up five pieces of litter with a grown-up" },
  { id: "pet-name", text: "Learn the name of a neighbor's pet" },
  { id: "leftovers", text: "Help pack leftovers for tomorrow" },
  { id: "breakfast-thanks", text: "Say thank you to the person who made breakfast" },
  { id: "read-beside", text: "Invite someone to read beside you" },
];
