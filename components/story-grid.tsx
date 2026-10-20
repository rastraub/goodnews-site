import { StoryCard } from "@/components/story-card";
import { Pager } from "@/components/pager";
import { pageCount, pageSlice } from "@/lib/paging";
import { toCard } from "@/lib/present";
import type { Story } from "@/lib/stories";

export function StoryGrid({
  stories,
  page,
  base,
  columns,
}: {
  stories: Story[];
  page: number;
  base: string;
  columns?: string;
}) {
  const slice = pageSlice(stories, page);
  return (
    <>
      <div className="grid" style={columns ? { gridTemplateColumns: columns } : undefined}>
        {slice.map((story) => (
          <StoryCard key={story.slug} story={toCard(story)} />
        ))}
      </div>
      <Pager base={base} page={page} pages={pageCount(stories.length)} />
    </>
  );
}
