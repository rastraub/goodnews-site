import { FIRST_INDEX_MONTH, formatMonthLabel } from "@/lib/good-news-index";
import { POPULATION_AS_OF, POPULATION_CITATION, POPULATION_RELEASE, POPULATION_URL } from "@/lib/population";
import { siteConfig } from "@/site.config";

export function IndexMethodology() {
  const first = formatMonthLabel(FIRST_INDEX_MONTH);
  return (
    <div className="index-method">
      <h3>What this counts</h3>
      <p>
        The Good News Index counts stories {siteConfig.name} published. It is not a measure of how good, kind, or safe a state or country is. A state with fewer stories was not judged. It is a state with fewer stories in this archive for that month.
      </p>
      <h3>Which stories</h3>
      <p>
        A story counts when it is published, not a draft, and its edition date falls in the calendar month. The edition date is the date on the story file. The open month stops at the Mountain Time build day, so a story dated after that day waits for the next build. {first} is the first edition. Stories dated earlier stay on the site and are not rolled into an index. A later month appears on its own once it has a published story and that month has started.
      </p>
      <p>
        An open month is labeled month to date. The updated-through date is the newest story date in the edition. A closed month keeps the counts from the stories dated in that month.
      </p>
      <h3>States and Washington, D.C.</h3>
      <p>
        Each United States story counts once in the national total. It also counts in its state, and in every other state listed on the story, the same way the state page works. Adding the state counts can come out higher than the number of United States stories. Washington, D.C. is listed with the states and is not called a state. A place with no story this month is still listed, so the 50 states and the District of Columbia are all here. It is not given a rank.
      </p>
      <h3>Per 1 million residents</h3>
      <p>
        Stories for that state, divided by the {POPULATION_AS_OF} resident population, times 1,000,000. {POPULATION_CITATION} The table was released in {POPULATION_RELEASE}.{" "}
        <a href={POPULATION_URL} target="_blank" rel="noopener noreferrer">
          Census table file
        </a>
        . Rates are not annualized. A partial month is not comparable to a finished month. One story in a small state can outrank a large state on this rate. Ranks use the unrounded rate. This page shows two decimal places. The CSV carries four, plus the population and the story count, so the rate can be recomputed.
      </p>
      <h3>Ranks</h3>
      <p>
        Ranks are competition ranks. A tie shares a place, and the next place skips. Story rank uses the story count. The per-person rank uses the unrounded rate. How-to-help rank uses the distinct link count. When two places share a count, the table lists the higher per-person rate first, then the name. That order does not change the shared rank.
      </p>
      <h3>Categories, topics, and classrooms</h3>
      <p>
        Categories are the section on the story. Topics are the tags on the story. A story with several topics is counted once for each, so topic counts can add up to more than the number of stories. Classroom stories are the ones marked for a read-aloud. The classroom total counts each story once. The state column also counts a classroom story in each state it appears in.
      </p>
      <h3>How to help</h3>
      <p>
        Each story has at least one How to help link. This index counts distinct donate, volunteer, and thank links. Learn-more links are left out, because many of them are a government page, a newsroom, or a short explainer rather than a place to give or volunteer. A leading www and the query string do not make a second link. Two pages on the same site stay two links. The story file does not say whether an organization is a registered nonprofit, so this is not a nonprofit census.
      </p>
      <h3>World</h3>
      <p>A story from outside the United States is grouped by its country. It is not added to a state.</p>
      <h3>Standout stories</h3>
      <p>
        Standouts follow the weekly roundup. Homepage marks still stored on a story from this month are listed: the story of the day, Today&apos;s Top 5, and the world pick. Every one of those marks is included. When they name fewer than five stories, the most-cheered stories in the month fill in, then the newest. Marks move when a later edition replaces them.
      </p>
    </div>
  );
}
