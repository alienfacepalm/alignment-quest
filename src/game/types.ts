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

export type AlignmentKey = (typeof alignmentOrder)[number];

export type GamePhase = "idle" | "generating" | "sorting" | "revealed";

export type Placements = Record<AlignmentKey, string | null>;

export type PersonCard = {
  id: string;
  name: string;
  role: string;
  clueTags: string[];
  hint: string;
  rationale: string;
  confidence: number;
  monogram: string;
  accent: string;
  alignment: AlignmentKey;
};

export type QuestBoard = {
  id: string;
  title: string;
  subtitle: string;
  disclaimer: string;
  palette: PersonCard[];
  answerKey: Placements;
};

/** @deprecated Use QuestBoard */
export type DemoBoard = QuestBoard;

export type QuestGuessDetail = {
  alignment: AlignmentKey;
  personId: string;
  correct: boolean;
  correctAlignment: AlignmentKey;
};

export type QuestScore = {
  /** 1 point per exact match; same as `exactMatches` (0–9). */
  points: number;
  exactMatches: number;
  details: QuestGuessDetail[];
};

/** @deprecated Use QuestScore */
export type BoardScore = QuestScore;
