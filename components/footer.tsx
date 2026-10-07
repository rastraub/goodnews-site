import Link from "next/link";
import { Logo } from "./logo";
import { CATEGORIES } from "@/lib/categories";
import { editionYear } from "@/lib/format";
import { siteConfig, socialLinks } from "@/site.config";

export function Footer() {
  const year = editionYear();
  return (
    <footer>
      <div className="wrap">
        <div className="fgrid">
          <div className="fbrand">
            <Logo />
            <p className="about">{siteConfig.description}</p>
            <div className="socials">
              {socialLinks().map((social) => (
                <a key={social.label} href={social.href} aria-label={`${social.short}, ${social.label}`} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden="true">{social.short}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="flabel">Read</p>
            <ul>
              <li><Link href="/">Today</Link></li>
              <li><Link href="/local">Local</Link></li>
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link href={`/category/${category.slug}`}>{category.label}</Link>
                </li>
              ))}
              <li><Link href="/rss.xml">RSS</Link></li>
            </ul>
          </div>
          <div>
            <p className="flabel">Our promise</p>
            <ul>
              <li><Link href="/about">How we verify</Link></li>
              <li><Link href="/about#no-politics">Our no-politics rule</Link></li>
              <li><Link href="/corrections">Corrections</Link></li>
              <li><Link href="/about">About us</Link></li>
            </ul>
          </div>
          <div>
            <p className="flabel">Join in</p>
            <ul>
              <li><Link href="/subscribe">Daily Top 5 email</Link></li>
              <li><Link href="/submit">Submit a story</Link></li>
              <li><Link href="/membership">Membership</Link></li>
              <li><Link href="/partner">Partner with us</Link></li>
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
