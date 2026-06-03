/** Ambient track for the photo reveal phase (file in /public/music). */
export const REVEAL_AMBIENT_MUSIC_SRC = `/music/${encodeURIComponent("time machine.mp3")}`;

export const REVEAL_MUSIC_VOLUME = 0.55;
/** Skip the intro — playback begins here on each fresh start. */
export const REVEAL_MUSIC_START_SECONDS = 1;

let audio: HTMLAudioElement | null = null;

export function getRevealAmbientAudioElement(): HTMLAudioElement {
  if (typeof window === "undefined") {
    throw new Error("Reveal ambient audio is only available in the browser");
  }

  if (!audio) {
    audio = new Audio(REVEAL_AMBIENT_MUSIC_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = REVEAL_MUSIC_VOLUME;
  }

  return audio;
}

export function preloadRevealAmbientAudio(): void {
  if (typeof window === "undefined") return;
  getRevealAmbientAudioElement().load();
}

/** Prime autoplay during a user gesture so playback can start later without one. */
export async function unlockRevealAmbientAudioForAutoplay(): Promise<void> {
  if (typeof window === "undefined") return;

  const element = getRevealAmbientAudioElement();
  try {
    if (element.currentTime < REVEAL_MUSIC_START_SECONDS) {
      element.currentTime = REVEAL_MUSIC_START_SECONDS;
    }
    await element.play();
    element.pause();
    element.currentTime = REVEAL_MUSIC_START_SECONDS;
  } catch {
    // Browser blocked — playback may still require a gesture when reveal starts.
  }
}

export async function playRevealAmbientAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const element = getRevealAmbientAudioElement();
  if (!element.paused) return true;

  try {
    if (element.currentTime < REVEAL_MUSIC_START_SECONDS) {
      element.currentTime = REVEAL_MUSIC_START_SECONDS;
    }
    await element.play();
    return true;
  } catch {
    return false;
  }
}

export function pauseRevealAmbientAudio(reset = true): void {
  if (!audio) return;

  audio.pause();
  if (reset) {
    audio.currentTime = REVEAL_MUSIC_START_SECONDS;
  }
}

export function shouldPlayRevealAmbientMusic(status: string | undefined): boolean {
  return status === "revealing" || status === "guessing";
}
