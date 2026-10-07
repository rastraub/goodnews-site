"use client";

import { useState } from "react";
import type { EmailInterest } from "@/lib/email";
import { siteConfig } from "@/site.config";

export function EmailSignup({
  interest = "daily",
  id = "daily-email",
  variant = "band",
}: {
  interest?: EmailInterest;
  id?: string;
  variant?: "band" | "inline";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interest, company }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setEmail("");
      setMessage(
        interest === "membership"
          ? `You're on the list. We'll write when membership opens at ${siteConfig.name}.`
          : `You're in. Look for the morning Top 5 from ${siteConfig.name}.`,
      );
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  const form = (
    <form className={variant === "band" ? "form" : "stack-form"} onSubmit={onSubmit}>
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} />
        </label>
      </div>
      <label className={variant === "band" ? "in" : "field"}>
        {variant === "band" ? (
          <svg className="ico" aria-hidden="true">
            <use href="#i-mail" />
          </svg>
        ) : (
          <span>Email address</span>
        )}
        <input
          type="email"
          required
          name="email"
          autoComplete="email"
          placeholder="Your email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="Email address"
        />
      </label>
      <button className="btn btn-ink" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : interest === "membership" ? "Join the waitlist" : "Get the Top 5"}
      </button>
    </form>
  );

  if (variant === "inline") {
    return (
      <div id={id}>
        {status === "success" ? (
          <p className="success-banner" role="status">{message}</p>
        ) : (
          form
        )}
        {status === "error" ? <p className="error" role="alert">{message}</p> : null}
      </div>
    );
  }

  return (
    <section className="email" id={id}>
      <div className="wrap">
        <div className="email-card">
          <svg className="rays" viewBox="0 0 200 200" aria-hidden="true">
            <g fill="#fff">
              <circle cx="100" cy="100" r="34" />
              <g id="ray">
                <rect x="96" y="6" width="8" height="44" rx="4" />
              </g>
              {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                <use key={angle} href="#ray" transform={`rotate(${angle} 100 100)`} />
              ))}
            </g>
          </svg>
          <div style={{ position: "relative" }}>
            <h2>Start every morning on the bright side.</h2>
            <p>
              Five true, uplifting stories in your inbox at 6 a.m. It takes two minutes to read and it sets the tone for the whole day.
            </p>
          </div>
          <div style={{ position: "relative" }}>
            {status === "success" ? (
              <p className="success-banner" role="status">{message}</p>
            ) : (
              form
            )}
            {status === "error" ? <p className="error" role="alert">{message}</p> : null}
            <div className="fine">
              <span>
                <svg className="ico" aria-hidden="true">
                  <use href="#i-check" />
                </svg>
                Free, every day
              </span>
              <span>Unsubscribe anytime</span>
              <span>We never sell your email</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
