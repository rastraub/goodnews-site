import { formatYearInReviewGapReport, getYearInReview, YEAR_IN_REVIEW_EDITIONS } from "../lib/year-in-review";

for (const edition of YEAR_IN_REVIEW_EDITIONS) {
  console.log(formatYearInReviewGapReport(getYearInReview(edition.year)));
  console.log("");
}
