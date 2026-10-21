const STORAGE_KEY = "socialbox_sound_enabled";

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

export function isSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage unavailable (private mode): the preference just won't persist.
  }
}

/**
 * Browsers keep audio suspended until the user has interacted with the page. Keeps listening for
 * gestures until the context is genuinely running, rather than giving up after the first one
 * (a gesture on a stale/blocked context doesn't always unlock it).
 */
export function unlockAudioOnFirstInteraction(): () => void {
  const events = ["pointerdown", "keydown"] as const;
  const remove = () => events.forEach((e) => window.removeEventListener(e, unlock));
  const unlock = () => {
    const ctx = getContext();
    if (!ctx) return;
    void ctx.resume().then(() => {
      if (ctx.state === "running") remove();
    });
  };
  events.forEach((e) => window.addEventListener(e, unlock));
  return remove;
}

export type SoundResult = "played" | "muted" | "blocked";

/**
 * Short two-note chime synthesized on the fly — no audio asset to load or ship. Returns
 * "blocked" when the browser is still refusing audio, so callers can tell the user instead of
 * failing silently.
 */
export async function playMessageSound(): Promise<SoundResult> {
  if (!isSoundEnabled()) return "muted";
  const ctx = getContext();
  if (!ctx) return "blocked";

  if (ctx.state !== "running") {
    // resume() stays pending while the browser's autoplay policy blocks it, so don't wait on it.
    await Promise.race([ctx.resume(), new Promise((resolve) => setTimeout(resolve, 250))]);
    // resume() mutates ctx.state, which TypeScript's narrowing above can't see.
    if ((ctx.state as AudioContextState) !== "running") return "blocked";
  }

  const now = ctx.currentTime;
  [
    { freq: 880, start: 0 },
    { freq: 1318.5, start: 0.12 },
  ].forEach(({ freq, start }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + 0.4);
  });
  return "played";
}
