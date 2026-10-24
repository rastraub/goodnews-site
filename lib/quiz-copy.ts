import { siteConfig } from "@/site.config";

/** Spoiler-free line for the share sheet and the clipboard. The link is separate. */
export function quizShareText(score: number, total: number): string {
  return `I got ${score}/${total} on this week's ${siteConfig.name} Good News Quiz`;
}

export function quizShareUrl(path: string, kidMode: boolean): string {
  const url = `${siteConfig.url}${path}`;
  return kidMode ? `${url}?kids=1` : url;
}
