import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { StoryGrid } from "@/components/story-grid";
import { getHubByPath, getHubIndex, storiesForHub, type Hub } from "@/lib/hubs";
import { pageCount, pagePath, pageSlice } from "@/lib/paging";
import { listingJsonLd, listingMeta } from "@/lib/seo";

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

export function hubMetadata(path: string, page: number): Metadata {
  const hub = getHubByPath(path);
  if (!hub || page > pageCount(hub.count)) return {};
  const image = storiesForHub(hub)[0];
  return listingMeta({
    title: hub.title,
    description: hub.description,
    base: hub.path,
    page,
    total: hub.count,
    image: image ? { url: image.image, alt: image.imageAlt } : undefined,
  });
}

export function HubBrowse({ path, page }: { path: string; page: number }) {
  const hub = getHubByPath(path);
  if (!hub) notFound();
  const pages = pageCount(hub.count);
  if (page > pages) notFound();
  const stories = storiesForHub(hub);
  const links = relatedLinks(hub);
  const current = pagePath(hub.path, page);

  return (
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
        <StoryGrid stories={stories} page={page} base={hub.path} />
      </div>
    </div>
  );
}
