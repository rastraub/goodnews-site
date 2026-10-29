"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { CATEGORIES } from "@/lib/categories";

const PRIMARY = [
  { href: "/", label: "Today" },
  { href: "/local", label: "Local" },
  { href: "/world", label: "World" },
  ...CATEGORIES.map((category) => ({ href: `/category/${category.slug}`, label: category.label })),
];

export function Header({ edition, quizHref }: { edition: string; quizHref?: string }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  const more = [
    ...(quizHref ? [{ href: quizHref, label: "Quiz" }] : []),
    { href: "/heroes", label: "Hometown Heroes" },
    { href: "/kids", label: "Kids" },
    { href: "/topics", label: "Topics" },
    { href: "/explainers", label: "Explainers" },
    { href: "/on-this-day", label: "On this day" },
    { href: "/good-neighbor", label: "Good Neighbor" },
  ];

  function active(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/local") return pathname === "/local" || pathname.startsWith("/state/");
    if (href === "/world") return pathname === "/world" || pathname.startsWith("/country/");
    if (href === "/topics") return pathname === "/topics" || pathname.startsWith("/topic/");
    if (href === "/quiz" || href.startsWith("/quiz/")) return pathname === "/quiz" || pathname.startsWith("/quiz/");
    if (href === "/good-neighbor") return pathname === "/good-neighbor" || pathname.startsWith("/good-neighbor/");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      <div className="strip">
        <div className="wrap">
          <div className="date">
            <b>Today&apos;s edition</b> · {edition}
          </div>
          <div className="promise">
            <span>
              <svg className="ico" style={{ color: "#7FD1A8" }} aria-hidden="true">
                <use href="#i-shield" />
              </svg>
              Every story verified
            </span>
            <span>No politics. Ever.</span>
            <span className="hide-m">No pop-ups</span>
          </div>
        </div>
      </div>
      <header className="nav">
        <div className="wrap">
          <Logo />
          <nav className="links" aria-label="Primary">
            {PRIMARY.map((link) => (
              <Link key={link.href} href={link.href} className={active(link.href) ? "on" : undefined}>
                {link.label}
              </Link>
            ))}
            {quizHref ? (
              <Link href={quizHref} className={active(quizHref) ? "on" : undefined}>
                Quiz
              </Link>
            ) : null}
            <Link href="/submit" className={`submit${active("/submit") ? " on" : ""}`}>
              <svg className="ico" aria-hidden="true">
                <use href="#i-pen" />
              </svg>
              Submit a Story
            </Link>
          </nav>
          <div className="nav-right">
            <Link href="/search" className="iconbtn" aria-label="Search stories">
              <svg className="ico" aria-hidden="true">
                <use href="#i-search" />
              </svg>
            </Link>
            <Link href="/subscribe" className="btn btn-gold">
              Subscribe
            </Link>
            <button
              type="button"
              className="menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpenPath(open ? null : pathname)}
            >
              <span className="sr">Menu</span>
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 6h14M3 10h14M3 14h14" stroke="#1C2733" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div className={`menu-panel${open ? " open" : ""}`} id="mobile-menu">
        {[...PRIMARY, ...more].map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <Link href="/submit">Submit a Story</Link>
        <Link href="/search">Search</Link>
        <Link href="/about">How we verify</Link>
        <Link href="/subscribe">Subscribe</Link>
      </div>
      <div className="catbar">
        {[...PRIMARY, ...more.filter((link) => link.href !== "/heroes")].map((link) => (
          <Link key={link.href} href={link.href} className={active(link.href) ? "on" : undefined}>
            {link.label}
          </Link>
        ))}
        {more
          .filter((link) => link.href === "/heroes")
          .map((link) => (
            <Link key={link.href} href={link.href} className={active(link.href) ? "hub on" : "hub"}>
              {link.label}
            </Link>
          ))}
      </div>
    </>
  );
}
