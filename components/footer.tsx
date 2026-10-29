import Link from "next/link";
import { Logo } from "./logo";
import { CATEGORIES } from "@/lib/categories";
import { FIRST_RESPONDERS_DAY_PATH } from "@/lib/first-responders-day";
import { editionYear } from "@/lib/format";
import { ON_THIS_DAY_TODAY_PATH } from "@/lib/on-this-day";
import { latestQuiz } from "@/lib/quiz";
import { THANKS_PATH } from "@/lib/thanks";
import { VETERANS_DAY_PATH } from "@/lib/veterans-day";
import { siteConfig, socialLinks } from "@/site.config";

export function Footer() {
  const year = editionYear();
  const socials = socialLinks();
  const quiz = latestQuiz();
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div className="fbrand">
            <Logo />
            <p className="about">{siteConfig.description}</p>
            {socials.length ? (
              <div className="socials">
                {socials.map((social) => (
                  <a key={social.label} href={social.href} aria-label={social.label} target="_blank" rel="noopener noreferrer">
                    <span aria-hidden="true">{social.short}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <div>
            <p className="flabel">Read</p>
            <ul>
              <li><Link href="/">Today</Link></li>
              <li><Link href="/local">Local</Link></li>
              <li><Link href="/world">World</Link></li>
              <li><Link href="/week">This week</Link></li>
              <li><Link href="/good-news-index">Good News Index</Link></li>
              <li><Link href={THANKS_PATH}>50 States of Thanks</Link></li>
              <li><Link href="/web-stories">Web stories</Link></li>
              {quiz ? <li><Link href={quiz.path}>Good News Quiz</Link></li> : null}
              <li><Link href={ON_THIS_DAY_TODAY_PATH}>Good news on this day</Link></li>
              <li><Link href="/kids">For classrooms</Link></li>
              <li><Link href="/classroom">Good News Friday</Link></li>
              <li><Link href={VETERANS_DAY_PATH}>Veterans Day</Link></li>
              <li><Link href={FIRST_RESPONDERS_DAY_PATH}>First Responders Day</Link></li>
              <li><Link href="/topics">Topics</Link></li>
              <li><Link href="/explainers">Explainers</Link></li>
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link href={`/category/${category.slug}`}>{category.label}</Link>
                </li>
              ))}
              <li><Link href="/rss.xml">RSS</Link></li>
              <li><Link href="/feeds">All feeds</Link></li>
              <li><Link href="/atom.xml">Atom</Link></li>
            </ul>
          </div>
          <div>
            <p className="flabel">Our promise</p>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/about#how-we-verify">How we verify</Link></li>
              <li><Link href="/editorial-standards">Editorial standards</Link></li>
              <li><Link href="/sources">Newsrooms we credit</Link></li>
              <li><Link href="/about#no-politics">Our no-politics rule</Link></li>
              <li><Link href="/corrections">Corrections</Link></li>
            </ul>
          </div>
          <div>
            <p className="flabel">Join in</p>
            <ul>
              <li><Link href="/subscribe">Daily Top 5 email</Link></li>
              <li><Link href="/kids#teachers">Teacher email</Link></li>
              <li><Link href="/giving-tuesday">Giving Tuesday</Link></li>
              <li><Link href="/submit">Submit a story</Link></li>
              <li><Link href="/membership">Membership</Link></li>
              <li><Link href="/partner">Partner with us</Link></li>
              <li><Link href="/featured">Featured on {siteConfig.name}</Link></li>
            </ul>
          </div>
        </div>
        <div className="fbottom">
          <span>© {year} {siteConfig.name} · {siteConfig.domain}</span>
          <span>
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/contact">Contact</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
