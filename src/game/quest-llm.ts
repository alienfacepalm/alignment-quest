import { getOpenAiApiKey } from "../config/openai";
import type { TAlignmentKey, TPersonCard, TPlacements, TQuestBoard } from "./types";
import { alignmentOrder } from "./types";

type TLlmPerson = {
  name: string;
  role: string;
  alignment: string;
  hint?: string;
  rationale?: string;
  confidence?: number;
  clueTags?: string[];
  /** 2–3 sentences: distinctive look for stylized art — recognizable likeness for the named person. */
  portraitVisual?: string;
};

type TLlmPayload = {
  title?: string;
  subtitle?: string;
  disclaimer?: string;
  people?: TLlmPerson[];
};

function shouldRegenerateBoardFromErrorMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("duplicate alignment") ||
    m.includes("omitted required alignment") ||
    m.includes("invalid alignment") ||
    m.includes('expected 9 people in "people"') ||
    m.includes("each person must have a non-empty name")
  );
}

function hashTopicKey(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) >> 0;
  }
  return Math.abs(h).toString(36);
}

function isAlignmentKey(value: string): value is TAlignmentKey {
  return (alignmentOrder as readonly string[]).includes(value);
}

function monogramFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0] ?? "";
    const b = parts[parts.length - 1]![0] ?? "";
    return `${a}${b}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return trimmed;
}

/**
 * Builds a full board from the user's topic using OpenAI (JSON mode).
 * Requires `EXPO_PUBLIC_OPENAI_API_KEY`. Optional: `EXPO_PUBLIC_OPENAI_MODEL` (default `gpt-4o-mini`).
 */
export async function fetchQuestBoardFromLlm(
  userTopic: string,
  opts?: { requiredNames?: string[]; randomSeed?: string },
): Promise<TQuestBoard> {
  const topic = userTopic.trim() || "Custom topic";
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error(
      "No OpenAI key found. Add OPENAI_API_KEY or EXPO_PUBLIC_OPENAI_API_KEY to .env.local (loaded via app.config.js), then restart Expo.",
    );
  }

  const model = process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const topicEsc = topic.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const requiredNames = (opts?.requiredNames ?? []).map((n) => n.trim()).filter(Boolean).slice(0, 9);
  const requiredNamesEsc = requiredNames.map((n) => n.replace(/\\/g, "\\\\").replace(/"/g, '\\"'));
  const baseSeed = opts?.randomSeed?.trim();

  const MAX_REGEN_ATTEMPTS = 4;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_REGEN_ATTEMPTS; attempt += 1) {
    const seed = baseSeed ? `${baseSeed}#regen${attempt}` : `regen${attempt}`;

    const system = `You design a playful D&D-style 3×3 alignment chart minigame.
Return ONLY a single JSON object (no markdown fences) with this exact shape:
{
  "title": string (short deck title tied to the topic),
  "subtitle": string (one line, what this run is),
  "disclaimer": string (brief: fictional / game use, not factual claims about real people),
  "people": [ EXACTLY 9 objects, each:
    {
      "name": string (unique),
      "role": string (one line: who they are in this topic),
      "alignment": one of: lawful-good, neutral-good, chaotic-good, lawful-neutral, true-neutral, chaotic-neutral, lawful-evil, neutral-evil, chaotic-evil,
      "hint": string,
      "rationale": string (why this alignment fits, <= 220 chars),
      "confidence": number between 0 and 1,
      "clueTags": array of 1-5 short strings,
      "portraitVisual": string (REQUIRED: 2-3 short sentences for CARTOON / CARICATURE portrait art (NOT a photo). For each "name", describe the figure's WIDELY RECOGNIZABLE, distinctive look—face shape, hair, skin tone/age read, signature glasses or facial hair if famous for them, and typical on-camera dress or prop—plus one or two exaggerated signature traits (e.g., big smile, expressive eyebrows, signature hairstyle) so the illustrated bust clearly reads as that specific person, not a generic stand-in. Must match "name" and "role" and be unique from the other eight.)
    }
  ]
}
Rules:
- Topic to reflect: "${topicEsc}".
- Random seed: "${seed}" (use it to vary choices).
- Pick nine distinct figures (real, fictional, or archetypes) that fit the topic; assign each to exactly one alignment.
- If a required cast list is provided, you MUST include each required name EXACTLY (verbatim) as a "name" in the nine people. Fill the remaining slots with other distinct figures that fit the topic/cast vibe.
- Each of the nine alignment strings must appear exactly once across the nine people.
- Each "portraitVisual" must be different from the other eight. For real public figures, lean on their famous, publicly discussed appearance (recognizable at a glance in stylized art).
- JSON must be valid UTF-8; use double quotes for all keys and strings.`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content:
                `Topic: ${topic}\n` +
                (requiredNamesEsc.length
                  ? `Required names (include verbatim): ${requiredNamesEsc.join(", ")}\n`
                  : "") +
                `Produce the JSON chart now.`,
            },
          ],
          temperature: 0.75,
        }),
      });

      const rawText = await res.text();
      if (!res.ok) {
        throw new Error(`OpenAI request failed (${res.status}): ${rawText.slice(0, 500)}`);
      }

      let body: { choices?: Array<{ message?: { content?: string } }> };
      try {
        body = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: string } }> };
      } catch {
        throw new Error("OpenAI returned non-JSON.");
      }

      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty model response.");
      }

      let parsed: TLlmPayload;
      try {
        parsed = JSON.parse(extractJsonObject(content)) as TLlmPayload;
      } catch {
        throw new Error("Model output was not valid JSON.");
      }

      const rows = parsed.people;
      if (!Array.isArray(rows) || rows.length !== 9) {
        throw new Error(`Expected 9 people in "people", got ${rows?.length ?? 0}.`);
      }

      const used = new Set<TAlignmentKey>();
      const topicHash = hashTopicKey(topic);
      const palette: TPersonCard[] = rows.map((p, i) => {
        const alignment = String(p.alignment || "").trim();
        if (!isAlignmentKey(alignment)) {
          throw new Error(`Invalid alignment: ${p.alignment}`);
        }
        if (used.has(alignment)) {
          throw new Error(`Duplicate alignment in model output: ${alignment}`);
        }
        used.add(alignment);

        const name = String(p.name || "").trim().slice(0, 96);
        if (!name) {
          throw new Error("Each person must have a non-empty name.");
        }

        const role = String(p.role || "").trim().slice(0, 200);
        const tags = Array.isArray(p.clueTags)
          ? p.clueTags.map((t) => String(t).trim()).filter(Boolean).slice(0, 6)
          : [];

        const portraitVisual = String(p.portraitVisual || "").trim().slice(0, 400);

        return {
          id: `llm-${topicHash}-${i}`,
          name,
          role: role || "—",
          alignment,
          hint: String(p.hint || "").trim().slice(0, 240),
          rationale: String(p.rationale || "").trim().slice(0, 500),
          confidence:
            typeof p.confidence === "number" && Number.isFinite(p.confidence)
              ? Math.min(1, Math.max(0, p.confidence))
              : 0.72,
          monogram: monogramFromName(name),
          accent: "#888888",
          clueTags: tags.length ? tags : [topic.length > 36 ? `${topic.slice(0, 33)}…` : topic],
          portraitVisual: portraitVisual || undefined,
        };
      });

      for (const slot of alignmentOrder) {
        if (!used.has(slot)) {
          throw new Error(`Model omitted required alignment: ${slot}`);
        }
      }

      const answerKey = palette.reduce(
        (acc, person) => {
          acc[person.alignment] = person.id;
          return acc;
        },
        {
          "lawful-good": null,
          "neutral-good": null,
          "chaotic-good": null,
          "lawful-neutral": null,
          "true-neutral": null,
          "chaotic-neutral": null,
          "lawful-evil": null,
          "neutral-evil": null,
          "chaotic-evil": null,
        } as TPlacements,
      );

      return {
        id: `llm-board-${topicHash}`,
        title: String(parsed.title || topic).trim().slice(0, 120),
        subtitle: String(parsed.subtitle || "").trim().slice(0, 320),
        disclaimer: String(
          parsed.disclaimer ||
            "Generated for this minigame only—not factual claims about real people, organizations, or canon.",
        ).trim().slice(0, 500),
        palette,
        answerKey,
      };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_REGEN_ATTEMPTS - 1 && shouldRegenerateBoardFromErrorMessage(message)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to generate board.");
}
