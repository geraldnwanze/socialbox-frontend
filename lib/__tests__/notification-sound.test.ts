import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in for the browser's AudioContext that records what was played. */
function installAudio(initialState: "running" | "suspended", resumeWorks = true) {
  const oscillators: { frequency: { value: number }; start: ReturnType<typeof vi.fn> }[] = [];
  class FakeContext {
    state: AudioContextState = initialState;
    currentTime = 0;
    destination = {};
    resume = vi.fn(async () => {
      if (resumeWorks) this.state = "running";
      else await new Promise(() => undefined); // like a browser that never grants autoplay
    });
    createOscillator() {
      const osc = { type: "", frequency: { value: 0 }, connect: () => ({ connect: () => undefined }), start: vi.fn(), stop: vi.fn() };
      oscillators.push(osc);
      return osc;
    }
    createGain() {
      const param = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
      return { gain: param, connect: () => ({ connect: () => undefined }) };
    }
  }
  vi.stubGlobal("AudioContext", FakeContext);
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeContext;
  return { oscillators };
}

async function load() {
  vi.resetModules(); // the module keeps one AudioContext for the page's lifetime
  return import("@/lib/notification-sound");
}

describe("notification sound", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("is on by default, and remembers when it was turned off", async () => {
    const sound = await load();
    expect(sound.isSoundEnabled()).toBe(true);
    sound.setSoundEnabled(false);
    expect(sound.isSoundEnabled()).toBe(false);
    sound.setSoundEnabled(true);
    expect(sound.isSoundEnabled()).toBe(true);
  });

  it("plays a two-note chime when allowed", async () => {
    const { oscillators } = installAudio("running");
    const { playMessageSound } = await load();
    expect(await playMessageSound()).toBe("played");
    expect(oscillators.map((o) => o.frequency.value)).toEqual([880, 1318.5]);
    expect(oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true);
  });

  it("stays silent when muted, without touching audio", async () => {
    const { oscillators } = installAudio("running");
    const sound = await load();
    sound.setSoundEnabled(false);
    expect(await sound.playMessageSound()).toBe("muted");
    expect(oscillators).toHaveLength(0);
  });

  it("resumes a suspended context and then plays", async () => {
    const { oscillators } = installAudio("suspended", true);
    const { playMessageSound } = await load();
    expect(await playMessageSound()).toBe("played");
    expect(oscillators).toHaveLength(2);
  });

  it("reports 'blocked' (instead of failing silently) when the browser won't allow audio yet", async () => {
    vi.useFakeTimers();
    const { oscillators } = installAudio("suspended", false);
    const { playMessageSound } = await load();
    const result = playMessageSound();
    await vi.advanceTimersByTimeAsync(300);
    expect(await result).toBe("blocked");
    expect(oscillators).toHaveLength(0);
    vi.useRealTimers();
  });

  it("reports 'blocked' when the browser has no audio support at all", async () => {
    vi.stubGlobal("AudioContext", undefined);
    (window as unknown as { AudioContext: unknown }).AudioContext = undefined;
    const { playMessageSound } = await load();
    expect(await playMessageSound()).toBe("blocked");
  });

  it("keeps listening for a click or key press until audio is really unlocked, then stops", async () => {
    installAudio("suspended", true);
    const { unlockAudioOnFirstInteraction } = await load();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    unlockAudioOnFirstInteraction();
    expect(add.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["pointerdown", "keydown"]));

    window.dispatchEvent(new Event("pointerdown"));
    await vi.waitFor(() => expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["pointerdown", "keydown"])));
  });

  it("can be cancelled by the caller", async () => {
    installAudio("suspended", true);
    const { unlockAudioOnFirstInteraction } = await load();
    const remove = vi.spyOn(window, "removeEventListener");
    const stop = unlockAudioOnFirstInteraction();
    stop();
    expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(["pointerdown", "keydown"]));
  });
});
