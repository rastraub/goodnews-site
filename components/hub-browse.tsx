import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EmailSignup } from "@/components/email-signup";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { getCategory } from "@/lib/categories";
import { helpMentions } from "@/lib/cities";
import { HELP_KIND_LABEL } from "@/lib/help";
import { getHubByPath, getHubIndex, storiesForHub, type Hub } from "@/lib/hubs";
import { pageCount, pagePath, pageSlice } from "@/lib/paging";
import { openGraphImage } from "@/lib/feed-image";
import { listingJsonLd, listingMeta } from "@/lib/seo";
import type { Story } from "@/lib/stories";

function relatedLinks(hub: Hub): { href: string; label: string }[] {
  const index = getHubIndex();
  const links: { href: string; label: string }[] = [];
  if (hub.stateSlug) {
    const group = index.byStateSlug.get(hub.stateSlug);
    for (const item of group?.categories ?? []) {
      if (item.path !== hub.path) links.push({ href: item.path, label: item.linkLabel });
    }
    for (const item of group?.cities ?? []) {
      if (item.path !== hub.path) links.push({ href: item.path, label: item.linkLabel });
    }
  }
  if (hub.countrySlug) {
    for (const item of index.byCountrySlug.get(hub.countrySlug) ?? []) {
      if (item.path !== hub.path) links.push({ href: item.path, label: item.linkLabel });
    }
  }
  if (hub.kind === "topic") {
    const others = index.topics
      .filter((item) => item.path !== hub.path)
      .slice()
      .sort((a, b) => b.count - a.count || a.linkLabel.localeCompare(b.linkLabel));
    for (const item of others) {
      if (links.length >= 12) break;
      links.push({ href: item.path, label: item.linkLabel });
    }
  }
  return links.slice(0, 12);
}

function otherCities(hub: Hub): Hub[] {
  const index = getHubIndex();
  const list = hub.stateSlug
    ? (index.byStateSlug.get(hub.stateSlug)?.cities ?? [])
    : hub.countrySlug
      ? (index.byCountrySlug.get(hub.countrySlug) ?? [])
      : [];
  return list.filter((item) => item.path !== hub.path);
}

function categoryLinks(stories: Story[], stateSlug?: string): { href: string; label: string }[] {
  const counts = new Map<string, number>();
  for (const story of stories) counts.set(story.category, (counts.get(story.category) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .flatMap(([slug]) => {
      const category = getCategory(slug);
      if (!category) return [];
      const stateHub = stateSlug ? getHubByPath(`/state/${stateSlug}/${slug}`) : undefined;
      return [{ href: stateHub?.path ?? `/category/${slug}`, label: category.label }];
    });
}

export function hubMetadata(path: string, page: number): Metadata {
  const hub = getHubByPath(path);
  if (!hub || page > pageCount(hub.count)) return {};
  const image = storiesForHub(hub)[0];
  const meta = listingMeta({
    title: hub.title,
    description: hub.description,
    base: hub.path,
    page,
    total: hub.count,
    image: image ? openGraphImage(image) : undefined,
  });
  if (!hub.indexable) return { ...meta, robots: { index: false, follow: true } };
  return meta;
}

export function HubBrowse({ path, page }: { path: string; page: number }) {
  const hub = getHubByPath(path);
  if (!hub) notFound();
  const pages = pageCount(hub.count);
  if (page > pages) notFound();
  const stories = storiesForHub(hub);
  const cityPage = hub.kind === "city";
  const parent = cityPage ? hub.crumbs[hub.crumbs.length - 2] : undefined;
  const siblings = cityPage ? otherCities(hub) : [];
  const categories = cityPage ? categoryLinks(stories, hub.stateSlug) : [];
  const helps = cityPage && page === 1 ? helpMentions(stories) : [];
  const links = cityPage ? [] : relatedLinks(hub);
  const current = pagePath(hub.path, page);

  return (
    <>
      <div className="page-block">
        <JsonLd
          data={listingJsonLd({
            name: hub.title,
            description: hub.description,
            path: current,
            crumbs: hub.crumbs,
            stories: pageSlice(stories, page),
          })}
        />
        <div className="wrap page-hero">
          <p className="crumbs">
            {hub.crumbs.flatMap((crumb, index) => {
              const last = index === hub.crumbs.length - 1;
              const node = last ? (
                <span key={crumb.path}>{crumb.name}</span>
              ) : (
                <Link key={crumb.path} href={crumb.path}>
                  {crumb.name}
                </Link>
              );
              if (index === 0) return [node];
              return [
                <span key={`${crumb.path}-sep`} aria-hidden="true">/</span>,
                node,
              ];
            })}
          </p>
          <p className="kicker">{hub.kicker}</p>
          <h1>{hub.heading}</h1>
          <p className="lede">{hub.description}</p>
          {parent ? (
            <p>
              <Link className="more" href={parent.path}>
                Good news from {parent.name}
                <svg className="ico" aria-hidden="true"><use href="#i-arrow" /></svg>
              </Link>
            </p>
          ) : null}
          {categories.length ? (
            <p className="link-pills">
              {categories.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </p>
          ) : null}
          {links.length ? (
            <p className="link-pills">
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </p>
          ) : null}
        </div>
        <div className="wrap" style={{ paddingTop: 28 }}>
          {cityPage ? <h2 className="side-title">Latest stories</h2> : null}
          <StoryGrid stories={stories} page={page} base={hub.path} />
        </div>
        {siblings.length ? (
          <div className="wrap" style={{ paddingTop: 8 }}>
            <h2 className="side-title">Other cities in {parent?.name}</h2>
            <p className="link-pills">
              {siblings.map((item) => {
                const name = item.crumbs[item.crumbs.length - 1]?.name ?? item.linkLabel;
                return (
                  <Link key={item.path} href={item.path}>
                    {name} · {item.count}
                  </Link>
                );
              })}
            </p>
          </div>
        ) : null}
        {helps.length ? (
          <div className="wrap" style={{ paddingTop: 12 }}>
            <h2 className="side-title" id="how-to-help">How to help</h2>
            <p className="lede">Ways to help named in these stories.</p>
            <div className="help-list" style={{ maxWidth: 720, marginTop: 16 }}>
              {helps.map((item) => (
                <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">
                  <span>{item.label}</span>
                  <small>{HELP_KIND_LABEL[item.kind]}</small>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {cityPage && page === 1 ? <EmailSignup /> : null}
    </>
  );
}
