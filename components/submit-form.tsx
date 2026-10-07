"use client";

import { useState } from "react";
import { STATES } from "@/lib/states";

const EMPTY = { name: "", email: "", city: "", state: "", summary: "", sourceUrl: "", company: "" };

export function SubmitForm() {
  const [fields, setFields] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "We couldn't save that tip. Please try again.");
        return;
      }
      setStatus("success");
      setFields(EMPTY);
      setMessage("Thank you. An editor checks every tip before anything is published.");
    } catch {
      setStatus("error");
      setMessage("We couldn't save that tip. Please try again.");
    }
  }

  if (status === "success") {
    return <p className="success-banner" role="status">{message}</p>;
  }

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={fields.company} onChange={(event) => set("company", event.target.value)} />
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>Your name</span>
          <input required value={fields.name} onChange={(event) => set("name", event.target.value)} autoComplete="name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input required type="email" value={fields.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" />
        </label>
        <label className="field">
          <span>City</span>
          <input required value={fields.city} onChange={(event) => set("city", event.target.value)} />
        </label>
        <label className="field">
          <span>State</span>
          <select required value={fields.state} onChange={(event) => set("state", event.target.value)}>
            <option value="">Choose a state</option>
            {STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>What happened?</span>
        <textarea
          required
          minLength={40}
          value={fields.summary}
          onChange={(event) => set("summary", event.target.value)}
          placeholder="Who did something kind, where, and how you know it's true."
        />
      </label>
      <label className="field">
        <span>Link to a source, if you have one</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://"
          value={fields.sourceUrl}
          onChange={(event) => set("sourceUrl", event.target.value)}
        />
      </label>
      {status === "error" ? <p className="error" role="alert">{message}</p> : null}
      <button className="btn btn-ink" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Submit a story"}
      </button>
    </form>
  );
}
