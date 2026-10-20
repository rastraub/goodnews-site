import { siteConfig } from "@/site.config";

/** Public IndexNow key. The matching file in /public must contain only this value. */
export const indexNowKey = "fbee1740e4e54d2e015e67064a291339";

export function indexNowKeyLocation(): string {
  return `${siteConfig.url}/${indexNowKey}.txt`;
}
