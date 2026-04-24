export const alignmentOrder = [
  "lawful-good",
  "neutral-good",
  "chaotic-good",
  "lawful-neutral",
  "true-neutral",
  "chaotic-neutral",
  "lawful-evil",
  "neutral-evil",
  "chaotic-evil",
] as const;

export type TAlignmentKey = (typeof alignmentOrder)[number];

export type TGamePhase = "idle" | "generating" | "sorting" | "revealed";

export type TPlacements = Record<TAlignmentKey, string | null>;

export type TPersonCard = {
  id: string;
  name: string;
  role: string;
  clueTags: string[];
  hint: string;
  rationale: string;
  confidence: number;
  monogram: string;
  accent: string;
  alignment: TAlignmentKey;
  /** LLM- or data-authored visual cues for image generation; optional on demo boards. */
  portraitVisual?: string;
  /** Local `file://` cache URI from OpenAI image generation, when available. */
  portraitUri?: string;
};

export type TQuestBoard = {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  palette: TPersonCard[];
  answerKey: TPlacements;
};

/** @deprecated Use QuestBoard */
export type TDemoBoard = TQuestBoard;

export type TQuestGuessDetail = {
  alignment: TAlignmentKey;
  personId: string;
  correct: boolean;
  correctAlignment: TAlignmentKey;
};

export type TQuestScore = {
  /** 1 point per exact match; same as `exactMatches` (0–9). */
  points: number;
  exactMatches: number;
  details: TQuestGuessDetail[];
};

/** @deprecated Use QuestScore */
export type TBoardScore = TQuestScore;
