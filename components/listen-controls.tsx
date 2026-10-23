"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  chunkSpeech,
  LISTEN_RATES,
  parseListenRate,
  preferredVoice,
  voiceMenu,
  type ListenRate,
  type ListenSegment,
} from "@/lib/listen-text";

const RATE_KEY = "listen-rate";
const VOICE_KEY = "listen-voice";
const UNAVAILABLE = "This browser can't read aloud right now.";

type Phase = "idle" | "playing" | "paused";
type Chunk = { id: string; text: string };

type Props = {
  label: string;
  segments: ListenSegment[];
  kidSegments?: ListenSegment[];
  groupLabel?: string;
  className?: string;
};

const prefListeners = new Set<() => void>();

function emitPrefs() {
  prefListeners.forEach((listener) => listener());
}

function subscribePrefs(listener: () => void) {
  prefListeners.add(listener);
  return () => prefListeners.delete(listener);
}

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* Private browsing can reject storage. The choice still applies this visit. */
  }
  emitPrefs();
}

function rateSnapshot(): ListenRate {
  return parseListenRate(readStorage(RATE_KEY));
}

function voiceSnapshot(): string {
  return readStorage(VOICE_KEY);
}

function subscribeSupport(): () => void {
  return () => {};
}

function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const synth = window.speechSynthesis;
  return Boolean(synth && typeof synth.speak === "function");
}

const heldUtterances: SpeechSynthesisUtterance[] = [];

function holdUtterance(utterance: SpeechSynthesisUtterance) {
  heldUtterances.push(utterance);
  if (heldUtterances.length > 8) heldUtterances.shift();
}

let highlighted: HTMLElement | null = null;

function setHighlight(id: string | null) {
  if (highlighted) {
    highlighted.classList.remove("is-speaking");
    highlighted = null;
  }
  if (!id || typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("is-speaking");
  highlighted = el;
  const rect = el.getBoundingClientRect();
  const inView = rect.top >= 64 && rect.bottom <= window.innerHeight - 16;
  if (inView) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
}

function expand(segments: ListenSegment[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const segment of segments) {
    for (const text of chunkSpeech(segment.text)) chunks.push({ id: segment.id, text });
  }
  return chunks;
}

function progressFor(chunks: Chunk[], index: number): string {
  const ids: string[] = [];
  for (const chunk of chunks) {
    if (ids[ids.length - 1] !== chunk.id) ids.push(chunk.id);
  }
  if (ids.length < 2) return "";
  const position = ids.indexOf(chunks[index]?.id ?? "");
  return position >= 0 ? `${position + 1} of ${ids.length}` : "";
}

export function ListenControls(props: Props) {
  const supported = useSyncExternalStore(subscribeSupport, speechSupported, () => false);
  const pathname = usePathname();
  if (!supported || props.segments.length === 0) return null;
  return <ListenBar key={pathname} {...props} />;
}

function ListenBar({ label, segments, kidSegments, groupLabel, className }: Props) {
  const rate = useSyncExternalStore(subscribePrefs, rateSnapshot, () => 1 as ListenRate);
  const savedVoice = useSyncExternalStore(subscribePrefs, voiceSnapshot, () => "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [kidOn, setKidOn] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [progress, setProgress] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const rateRef = useRef(rate);
  const voiceRef = useRef(savedVoice);
  rateRef.current = rate;
  voiceRef.current = savedVoice;

  const session = useRef({
    epoch: 0,
    chunks: [] as Chunk[],
    index: 0,
    phase: "idle" as Phase,
    timer: 0,
    utterance: null as SpeechSynthesisUtterance | null,
  });

  function clearTimer() {
    window.clearTimeout(session.current.timer);
    session.current.timer = 0;
  }

  function finish(message: string) {
    const current = session.current;
    current.epoch += 1;
    current.phase = "idle";
    current.chunks = [];
    current.index = 0;
    current.utterance = null;
    clearTimer();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setHighlight(null);
    setPhase("idle");
    setProgress("");
    setAnnouncement(message);
  }

  function utter(index: number) {
    const current = session.current;
    if (current.phase !== "playing") return;
    const chunk = current.chunks[index];
    if (!chunk) {
      finish("Finished reading.");
      return;
    }
    clearTimer();
    current.epoch += 1;
    current.index = index;
    const epoch = current.epoch;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    const chosen = preferredVoice(synth.getVoices(), voiceRef.current || null);
    utterance.rate = rateRef.current;
    utterance.lang = chosen?.lang || "en-US";
    if (chosen) utterance.voice = chosen;
    holdUtterance(utterance);
    current.utterance = utterance;

    let moved = false;
    const moveOn = () => {
      if (moved || epoch !== current.epoch || current.phase !== "playing" || current.index !== index) return;
      moved = true;
      clearTimer();
      const upcoming = current.chunks[index + 1];
      if (upcoming && upcoming.id !== chunk.id) {
        current.timer = window.setTimeout(() => utter(index + 1), 280);
        return;
      }
      utter(index + 1);
    };

    const estimate = () => Math.min(20, chunk.text.length / (12 * Math.max(utterance.rate, 0.5)) + 5) * 1000;
    const arm = (ms: number, onlyIfSilent: boolean) => {
      clearTimer();
      current.timer = window.setTimeout(() => {
        if (epoch !== current.epoch || current.phase !== "playing" || current.index !== index) return;
        if (onlyIfSilent && (synth.speaking || synth.pending)) {
          arm(estimate(), false);
          return;
        }
        synth.cancel();
        moveOn();
      }, ms);
    };

    utterance.onstart = () => {
      if (epoch !== current.epoch) return;
      setHighlight(chunk.id);
      setProgress(progressFor(current.chunks, index));
      arm(estimate(), false);
    };
    utterance.onend = () => {
      queueMicrotask(() => moveOn());
    };
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") return;
      if (epoch !== current.epoch) return;
      finish(UNAVAILABLE);
    };

    setHighlight(chunk.id);
    setProgress(progressFor(current.chunks, index));
    synth.resume();
    synth.speak(utterance);
    if (synth.paused) synth.resume();
    // If the browser drops this utterance, skip ahead instead of staying on Pause.
    arm(1500, true);
  }

  function start(list: ListenSegment[], message: string) {
    const chunks = expand(list);
    if (!chunks.length) return;
    const current = session.current;
    const restarting = current.phase !== "idle" || window.speechSynthesis.speaking || window.speechSynthesis.pending;
    current.chunks = chunks;
    current.index = 0;
    current.phase = "playing";
    current.epoch += 1;
    clearTimer();
    setPhase("playing");
    setAnnouncement(message);
    if (!restarting) {
      utter(0);
      return;
    }
    // A speak() in the same turn as cancel() is ignored in Chromium.
    window.speechSynthesis.cancel();
    current.timer = window.setTimeout(() => utter(0), 40);
  }

  function pause() {
    const current = session.current;
    if (current.phase !== "playing") return;
    current.epoch += 1;
    current.phase = "paused";
    clearTimer();
    window.speechSynthesis.cancel();
    setPhase("paused");
    setAnnouncement("Paused.");
  }

  function resume() {
    const current = session.current;
    if (current.phase !== "paused") return;
    current.phase = "playing";
    setPhase("playing");
    setAnnouncement("Reading aloud.");
    utter(current.index);
  }

  function restartIfSpeaking(list: ListenSegment[], message: string) {
    if (session.current.phase === "idle") return;
    start(list, message);
  }

  useEffect(() => {
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener("voiceschanged", load);
    const halt = () => {
      const current = session.current;
      current.epoch += 1;
      current.phase = "idle";
      window.clearTimeout(current.timer);
      synth.cancel();
      setHighlight(null);
    };
    window.addEventListener("pagehide", halt);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.removeEventListener("pagehide", halt);
      halt();
    };
  }, []);

  const kidAvailable = Boolean(kidSegments && kidSegments.length > 0);
  const kid = kidAvailable && kidOn;
  const script = kid && kidSegments ? kidSegments : segments;
  const menu = voiceMenu(voices);
  const saved = voices.find((voice) => voice.voiceURI === savedVoice);
  const options = saved && !menu.some((voice) => voice.voiceURI === saved.voiceURI) ? [saved, ...menu] : menu;
  const voiceValue = options.some((voice) => voice.voiceURI === savedVoice) ? savedVoice : "";

  const playLabel = phase === "playing" ? "Pause" : phase === "paused" ? "Resume" : label;
  const playAria =
    phase === "playing" ? "Pause reading" : phase === "paused" ? "Resume reading" : kid ? "Listen to the kid version" : label;

  function onPlay() {
    if (phase === "playing") {
      pause();
      return;
    }
    if (phase === "paused") {
      resume();
      return;
    }
    start(script, kid ? "Reading the kid version." : "Reading aloud.");
  }

  function onStop() {
    if (phase === "idle") return;
    finish("Stopped.");
  }

  function onRate(next: ListenRate) {
    rateRef.current = next;
    writeStorage(RATE_KEY, String(next));
    restartIfSpeaking(script, "Reading aloud.");
  }

  function onVoice(uri: string) {
    voiceRef.current = uri;
    writeStorage(VOICE_KEY, uri);
    restartIfSpeaking(script, "Reading aloud.");
  }

  function onKid() {
    const next = !kidOn;
    setKidOn(next);
    const list = next && kidSegments?.length ? kidSegments : segments;
    restartIfSpeaking(list, next ? "Reading the kid version." : "Reading aloud.");
  }

  return (
    <div className={className ?? "listen-bar"} role="group" aria-label={groupLabel ?? label} data-listen="">
      <button type="button" className={phase === "idle" ? "listen-play" : "listen-play is-active"} onClick={onPlay} aria-label={playAria}>
        {phase === "idle" ? (
          <svg className="ico" aria-hidden="true">
            <use href="#i-speaker" />
          </svg>
        ) : null}
        {playLabel}
      </button>
      <button type="button" className="listen-stop" onClick={onStop} disabled={phase === "idle"} aria-label="Stop reading">
        Stop
      </button>
      <select aria-label="Reading speed" value={String(rate)} onChange={(event) => onRate(parseListenRate(event.target.value))}>
        {LISTEN_RATES.map((option) => (
          <option key={option} value={option}>
            {option}x
          </option>
        ))}
      </select>
      <select aria-label="Reading voice" value={voiceValue} onChange={(event) => onVoice(event.target.value)}>
        <option value="">Auto (English)</option>
        {options.map((voice) => (
          <option key={voice.voiceURI} value={voice.voiceURI}>
            {voice.name}
          </option>
        ))}
      </select>
      {kidAvailable ? (
        <button type="button" className="listen-kid" aria-pressed={kid} onClick={onKid}>
          Kid version
        </button>
      ) : null}
      {progress ? <span className="listen-progress">{progress}</span> : null}
      <p className={announcement === UNAVAILABLE ? "listen-note" : "sr"} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
