import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";

export type TGameSfxId = "tap" | "place" | "score";

const sources: Record<TGameSfxId, number> = {
  tap: require("../../assets/sfx/tap.wav"),
  place: require("../../assets/sfx/place.wav"),
  score: require("../../assets/sfx/score.wav"),
};

const pool: Partial<Record<TGameSfxId, AudioPlayer>> = {};

let initPromise: Promise<void> | null = null;

export function preloadGameSfx(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          allowsRecording: false,
          interruptionMode: "duckOthers",
        });
        const ids: TGameSfxId[] = ["tap", "place", "score"];
        for (const id of ids) {
          pool[id] = createAudioPlayer(sources[id]);
        }
      } catch {
        initPromise = null;
      }
    })();
  }
  return initPromise;
}

export async function playGameSfx(id: TGameSfxId): Promise<void> {
  try {
    await preloadGameSfx();
    const player = pool[id];
    if (!player) {
      return;
    }
    await player.seekTo(0);
    player.play();
  } catch {
    // Web or missing native module — ignore
  }
}
