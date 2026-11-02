"use client";

import { useState } from "react";
import { AMBASSADOR_REPORT_TYPE, AMBASSADOR_SIGNUP_TYPE, type AmbassadorFormMode } from "@/lib/ambassador-tip";
import { STATES } from "@/lib/states";

const EMPTY = {
  name: "",
  email: "",
  city: "",
  state: "",
  region: "",
  group: "",
  grades: "",
  summary: "",
  act: "",
  sourceUrl: "",
  company: "",
};

export function SubmitForm({ mode = "story" }: { mode?: AmbassadorFormMode }) {
  const [fields, setFields] = useState(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const ambassador = mode !== "story";

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const pageUrl = window.location.href;
    const body =
      mode === "ambassador-signup"
        ? {
            type: AMBASSADOR_SIGNUP_TYPE,
            name: fields.name,
            email: fields.email,
            city: fields.city,
            region: fields.region,
            group: fields.group,
            grades: fields.grades,
            company: fields.company,
            pageUrl,
          }
        : mode === "ambassador-report"
          ? {
              type: AMBASSADOR_REPORT_TYPE,
              name: fields.name,
              email: fields.email,
              city: fields.city,
              region: fields.region,
              group: fields.group,
              act: fields.act,
              company: fields.company,
              pageUrl,
            }
          : {
              name: fields.name,
              email: fields.email,
              city: fields.city,
              state: fields.state,
              summary: fields.summary,
              sourceUrl: fields.sourceUrl,
              company: fields.company,
              pageUrl,
            };
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "We couldn't save that tip. Please try again.");
        return;
      }
      setStatus("success");
      setFields(EMPTY);
      setMessage(
        mode === "ambassador-signup"
          ? "Thank you. We received your class signup."
          : mode === "ambassador-report"
            ? "Thank you. We received your note."
            : "Thank you. We received your tip.",
      );
    } catch {
      setStatus("error");
      setMessage("We couldn't save that tip. Please try again.");
    }
  }

  if (status === "success") {
    return <p className="success-banner" role="status">{message}</p>;
  }

  const button =
    mode === "ambassador-signup" ? "Send the class signup" : mode === "ambassador-report" ? "Send the class note" : "Submit a story";

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input tabIndex={-1} autoComplete="off" value={fields.company} onChange={(event) => set("company", event.target.value)} />
        </label>
      </div>
      {ambassador ? (
        <p className="teacher-note">
          Send the first name of the teacher or leader, or the group name. Do not include student names or photos of children.
        </p>
      ) : null}
      <div className="form-grid">
        <label className="field">
          <span>{ambassador ? "First name, or the group name" : "Your name"}</span>
          <input
            required
            minLength={2}
            value={fields.name}
            onChange={(event) => set("name", event.target.value)}
            autoComplete={ambassador ? "given-name" : "name"}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input required type="email" value={fields.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" />
        </label>
        {ambassador ? (
          <label className="field">
            <span>School or group name</span>
            <input
              required
              minLength={2}
              value={fields.group}
              onChange={(event) => set("group", event.target.value)}
              autoComplete="organization"
            />
          </label>
        ) : null}
        <label className="field">
          <span>City</span>
          <input required minLength={ambassador ? 2 : undefined} value={fields.city} onChange={(event) => set("city", event.target.value)} autoComplete="address-level2" />
        </label>
        {ambassador ? (
          <label className="field">
            <span>State or country</span>
            <input
              required
              minLength={2}
              value={fields.region}
              onChange={(event) => set("region", event.target.value)}
              autoComplete="address-level1"
            />
          </label>
        ) : (
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
        )}
      </div>
      {mode === "ambassador-signup" ? (
        <label className="field">
          <span>Grade range</span>
          <input
            required
            minLength={1}
            maxLength={40}
            value={fields.grades}
            onChange={(event) => set("grades", event.target.value)}
            placeholder="K-2 or grades 6-8"
            autoComplete="off"
          />
          <span className="field-hint">A range for the class. Not a list of students.</span>
        </label>
      ) : null}
      {mode === "ambassador-report" ? (
        <label className="field">
          <span>What did the class do?</span>
          <textarea
            required
            minLength={20}
            value={fields.act}
            onChange={(event) => set("act", event.target.value)}
            placeholder="What the class did, in a sentence or two. No student names or photos of children."
          />
        </label>
      ) : null}
      {mode === "story" ? (
        <>
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
        </>
      ) : null}
      {status === "error" ? <p className="error" role="alert">{message}</p> : null}
      <button className="btn btn-ink" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : button}
      </button>
    </form>
  );
}
