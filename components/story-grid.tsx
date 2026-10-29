import { StoryCard } from "@/components/story-card";
import { Pager } from "@/components/pager";
import { listenCardId } from "@/lib/listen-text";
import { pageCount, pageSlice } from "@/lib/paging";
import { toCard } from "@/lib/present";
import type { Story } from "@/lib/stories";

export function StoryGrid({
  stories,
  page,
  base,
  columns,
  listen,
}: {
  stories: Story[];
  page: number;
  base: string;
  columns?: string;
  listen?: boolean;
}) {
  const slice = pageSlice(stories, page);
  return (
    <>
      <div className="grid" style={columns ? { gridTemplateColumns: columns } : undefined}>
        {slice.map((story) => (
          <StoryCard key={story.slug} story={toCard(story)} listenId={listen ? listenCardId(story.slug) : undefined} />
        ))}
      </div>
      <Pager base={base} page={page} pages={pageCount(stories.length)} />
    </>
  );
}
