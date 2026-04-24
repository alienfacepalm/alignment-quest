import {
  cacheDirectory,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { Platform } from "react-native";

import { getOpenAiApiKey } from "../config/openai";
import type { PersonCard, QuestBoard } from "./types";

const IMAGE_API = "https://api.openai.com/v1/images/generations";
const PORTRAIT_CONCURRENCY = 3;
const MAX_PROMPT_LEN = 1200;

function modelFallbackChain(): string[] {
  const primary = process.env.EXPO_PUBLIC_OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  return [primary, "gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini", "dall-e-3"].filter(
    (m, i, a) => m && a.indexOf(m) === i,
  );
}

const IMAGE_SIZE = process.env.EXPO_PUBLIC_OPENAI_IMAGE_SIZE?.trim() || "1024x1024";

function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33 + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 64) || "x";
}

function visualBlurbFromPerson(person: PersonCard): string {
  const fromLlm = person.portraitVisual?.trim();
  if (fromLlm) {
    return fromLlm;
  }
  const tags = (person.clueTags?.slice(0, 3) ?? []).join(", ");
  const parts = [person.role, person.hint, tags].filter(Boolean);
  return (parts.join(" — ").slice(0, 400) || person.role).trim();
}

function buildPortraitPrompt(person: PersonCard, board: QuestBoard): string {
  const blurb = visualBlurbFromPerson(person);
  const styleBlock =
    "Bust portrait, single face centered, soft rim light, muted simple background, no text, no watermark. " +
    "Cartoon / caricature illustration in a Dungeons and Dragons / fantasy TTRPG card-art style (NOT photoreal, NOT a photo). " +
    "Clean shapes, bold lines, slightly exaggerated signature facial features for recognizability. " +
    "CRITICAL: face and hair must match this person's WELL-KNOWN public look (age, face shape, hair, beard, skin tone, signature traits) so a pop-culture–literate viewer recognizes them. " +
    "Strong recognizable cartoon likeness, not a generic face.";
  const quest = board.title.trim().slice(0, 100);
  const role = person.role.trim();
  const namePart = `Character portrait: ${person.name}. `;
  const roleQuest = `Role: ${role}. Quest: ${quest}. `;
  const fixedSuffix = `${roleQuest}${styleBlock}`;
  // If over the API budget, trim only the blurb; keep likeness instructions intact.
  const maxBlurb = Math.max(0, MAX_PROMPT_LEN - namePart.length - fixedSuffix.length);
  const blurbOut =
    blurb.length <= maxBlurb
      ? blurb
      : blurb.length === 0
        ? blurb
        : `${blurb.slice(0, Math.max(0, maxBlurb - 1))}…`;
  return `${namePart}${blurbOut} ${fixedSuffix}`.replace(/\s+/g, " ").trim();
}

type GenerationsResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

async function postImageGeneration(body: object): Promise<GenerationsResponse> {
  const key = getOpenAiApiKey();
  if (!key) {
    throw new Error("Missing OpenAI API key for image generation.");
  }
  const res = await fetch(IMAGE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 500);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) {
        msg = j.error.message;
      }
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return JSON.parse(text) as GenerationsResponse;
}

/**
 * Tries `response_format: b64_json` first, then a plain generations request (URL in `data[0]`), across model fallbacks.
 */
async function fetchGeneratedImageData(prompt: string): Promise<{ b64?: string; url?: string }> {
  const models = modelFallbackChain();
  let lastErr: Error = new Error("All image models failed");

  for (const model of models) {
    for (const useB64 of [true, false]) {
      const body: Record<string, unknown> = {
        model,
        prompt,
        n: 1,
        size: IMAGE_SIZE,
      };
      if (useB64 && (model.startsWith("dall-e") || model.startsWith("gpt-image"))) {
        body.response_format = "b64_json";
      } else {
        delete body.response_format;
      }
      try {
        const out = await postImageGeneration(body);
        const first = out.data?.[0];
        if (first?.b64_json) {
          return { b64: first.b64_json };
        }
        if (first?.url) {
          return { url: first.url };
        }
        lastErr = new Error("Empty image slot in response");
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        const st = (e as { status?: number })?.status;
        if (st === 400 || st === 404) {
          break;
        }
        const m = (e as Error).message || "";
        if (m.toLowerCase().includes("model") || m.toLowerCase().includes("not found") || m.toLowerCase().includes("response_format")) {
          break;
        }
      }
    }
  }
  throw lastErr;
}

async function ensurePortraitFile(board: QuestBoard, person: PersonCard, prompt: string): Promise<string | undefined> {
  const h = djb2Hash(`${board.id}|${person.id}|${modelFallbackChain()[0] ?? ""}|${prompt}`);
  const fileName = `${sanitizeId(person.id)}-${h}.png`;
  if (Platform.OS === "web") {
    const { b64, url } = await fetchGeneratedImageData(prompt);
    if (b64) {
      return `data:image/png;base64,${b64}`;
    }
    if (url) {
      return url;
    }
    return undefined;
  }
  const base = cacheDirectory ?? documentDirectory;
  if (!base) {
    return undefined;
  }
  const dir = `${base}alignment-portraits/${sanitizeId(board.id)}/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const path = `${dir}${fileName}`;
  const info = await getInfoAsync(path);
  if (info.exists) {
    return path;
  }
  const { b64, url } = await fetchGeneratedImageData(prompt);
  if (b64) {
    await writeAsStringAsync(path, b64, { encoding: EncodingType.Base64 });
    return path;
  }
  if (url) {
    await downloadAsync(url, path);
    return path;
  }
  return undefined;
}

export type AttachPortraitsOptions = {
  onPersonUpdated?: (arg: { board: QuestBoard; personIndex: number; person: PersonCard }) => void;
};

/**
 * Fetches / caches a portrait for each person. Per-card errors are ignored (keeps playability).
 * Runs up to `PORTRAIT_CONCURRENCY` image requests in parallel; optional `onPersonUpdated` after each.
 */
export async function attachPortraitsToBoard(
  board: QuestBoard,
  options?: AttachPortraitsOptions,
): Promise<QuestBoard> {
  if (!getOpenAiApiKey()) {
    return board;
  }
  const { onPersonUpdated } = options ?? {};
  const n = board.palette.length;
  if (n === 0) {
    return board;
  }
  const palette: PersonCard[] = board.palette.map((p) => ({ ...p }));
  let nextIndex = 0;

  const runOne = async (index: number) => {
    const p = board.palette[index]!;
    try {
      const prompt = buildPortraitPrompt(p, board);
      const uri = await ensurePortraitFile(board, p, prompt);
      const next = uri ? { ...p, portraitUri: uri } : p;
      palette[index] = next;
      onPersonUpdated?.({ board: { ...board, palette: [...palette] }, personIndex: index, person: next });
    } catch {
      palette[index] = p;
      onPersonUpdated?.({ board: { ...board, palette: [...palette] }, personIndex: index, person: p });
    }
  };

  const worker = async () => {
    for (;;) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= n) {
        return;
      }
      await runOne(i);
    }
  };

  const poolSize = Math.min(PORTRAIT_CONCURRENCY, n);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));
  return { ...board, palette };
}
