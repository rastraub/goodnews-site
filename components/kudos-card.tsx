"use client";

import { useState } from "react";
import { kudosCardText, kudosMailto, kudosSms } from "@/lib/kudos-card-text";

const CARD_WIDTH = 1200;
const CREAM = "#FFFBF4";
const INK = "#1C2733";
const GOLD = "#F3B23C";
const GOLD_INK = "#8F5E00";
const BLUE = "#24537F";
const MUTED = "#4A5563";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = "";
      for (const char of word) {
        const trial = chunk + char;
        if (ctx.measureText(trial).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = trial;
        }
      }
      line = chunk;
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawCard(input: { headline: string; honoree: string; message: string; storyUrl: string; siteName: string }): HTMLCanvasElement | null {
  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) return null;
  const maxWidth = CARD_WIDTH - 128;
  scratch.font = "600 44px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  const headlineLines = wrapText(scratch, input.headline, maxWidth);
  scratch.font = "28px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  const messageLines = wrapText(scratch, input.message || " ", maxWidth);
  scratch.font = "22px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  const urlLines = wrapText(scratch, input.storyUrl, maxWidth);
  const height = Math.max(780, 250 + headlineLines.length * 56 + messageLines.length * 40 + urlLines.length * 30);

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, CARD_WIDTH, height);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, CARD_WIDTH, 18);

  let y = 72;
  ctx.fillStyle = GOLD_INK;
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText("GOOD NEWS KUDOS", 64, y);
  y += 48;
  ctx.fillStyle = BLUE;
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText(`For ${input.honoree}`, 64, y);
  y += 56;
  ctx.fillStyle = INK;
  ctx.font = "600 44px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  for (const line of headlineLines) {
    ctx.fillText(line, 64, y);
    y += 56;
  }
  y += 8;
  ctx.font = "28px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  for (const line of messageLines) {
    ctx.fillText(line, 64, y);
    y += 40;
  }
  y += 16;
  ctx.fillStyle = INK;
  ctx.font = "28px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  ctx.fillText("From:", 64, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(160, y + 6);
  ctx.lineTo(560, y + 6);
  ctx.stroke();
  y += 64;
  ctx.fillStyle = MUTED;
  ctx.font = "22px Georgia, 'Liberation Serif', 'Times New Roman', serif";
  for (const line of urlLines) {
    ctx.fillText(line, 64, y);
    y += 30;
  }
  ctx.fillText(`Shared via ${input.siteName}`, 64, y + 8);
  return canvas;
}

export function KudosCard({
  slug,
  headline,
  honoree,
  messageChoices,
  storyPath,
  storyUrl,
  siteName,
}: {
  slug: string;
  headline: string;
  honoree: string;
  messageChoices: readonly string[];
  storyPath: string;
  storyUrl: string;
  siteName: string;
}) {
  const [message, setMessage] = useState(messageChoices[0] ?? "");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const [fallback, setFallback] = useState("");

  const text = kudosCardText({ headline, honoree, message, storyUrl, siteName });
  const mailHref = kudosMailto(text, headline);
  const smsHref = kudosSms(text);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFallback("");
      setNote("");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFallback(text);
      setNote("Select the text below and copy it.");
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Kudos for ${honoree}`, text, url: storyUrl });
        setNote("");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText();
  }

  function download() {
    const canvas = drawCard({ headline, honoree, message, storyUrl, siteName });
    if (!canvas) {
      setNote("This browser could not build the image.");
      return;
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        setNote("This browser could not build the image.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kudos-${slug}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNote("The PNG is in your downloads.");
    });
  }

  return (
    <div>
      <div className="kudos-tools no-print">
        <fieldset>
          <legend>Thank-you message</legend>
          {messageChoices.map((choice) => (
            <label key={choice}>
              <input
                type="radio"
                name="kudos-message"
                checked={message === choice}
                onChange={() => setMessage(choice)}
              />
              <span>{choice}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          <span>Edit the message</span>
          <textarea
            value={message}
            maxLength={400}
            onChange={(event) => setMessage(event.target.value)}
            aria-label="Edit the thank-you message"
          />
        </label>
        <div className="actions">
          <button type="button" className="btn btn-ink" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="btn btn-outline" onClick={copyText}>
            {copied ? "Copied" : "Copy text"}
          </button>
          <button type="button" className="btn btn-outline" onClick={download}>
            Download PNG
          </button>
          <button type="button" className="btn btn-outline" onClick={share}>
            Share
          </button>
          <a className="btn btn-outline" href={mailHref}>
            Email
          </a>
          <a className="btn btn-outline" href={smsHref}>
            Text
          </a>
        </div>
        <p className="kudos-note">
          Print, copy, download, share, email, and text use your own device. This page does not send a message and does not ask for a phone number or an email address. The From line stays blank until you write a name by hand.
        </p>
        {note ? <p role="status">{note}</p> : null}
        {fallback ? <textarea readOnly value={fallback} className="quiz-share-fallback" aria-label="Card text to copy" /> : null}
      </div>
      <article className="kudos-sheet" aria-label="Kudos card">
        <p className="kicker">Good news kudos</p>
        <p className="kudos-for">For {honoree}</p>
        <h2>{headline}</h2>
        <p className="kudos-message">{message}</p>
        <p className="kudos-from">
          From: <span className="kudos-blank" aria-hidden="true" />
        </p>
        <p className="kudos-foot">
          <a href={storyPath}>{storyUrl}</a>
          <br />
          Shared via {siteName}
        </p>
        <p className="kudos-fold no-print">Fold or cut here. The card is the top half of a letter sheet.</p>
      </article>
    </div>
  );
}
