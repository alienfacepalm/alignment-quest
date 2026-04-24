import { TAlignmentKey, TPlacements, alignmentOrder } from "./types";

/**
 * Per-cell border / label colors for the 3×3 alignment grid (reference chart).
 * Row-major: good → neutral → evil; columns lawful → neutral → chaotic.
 */
export const ALIGNMENT_CELL_CHART_COLORS: Record<TAlignmentKey, string> = {
  "lawful-good": "#EB5757",
  "neutral-good": "#8FE8A8",
  "chaotic-good": "#C9A8FF",
  "lawful-neutral": "#4ED0F0",
  "true-neutral": "#F5A524",
  "chaotic-neutral": "#2F74D0",
  "lawful-evil": "#E942A8",
  "neutral-evil": "#C6F04D",
  "chaotic-evil": "#2FAB62",
};

/** Same tints as `ALIGNMENT_CELL_CHART_COLORS`, for the small logo grid. */
export const ALIGNMENT_CHART_GRID_ROWS: string[][] = [
  [
    ALIGNMENT_CELL_CHART_COLORS["lawful-good"],
    ALIGNMENT_CELL_CHART_COLORS["neutral-good"],
    ALIGNMENT_CELL_CHART_COLORS["chaotic-good"],
  ],
  [
    ALIGNMENT_CELL_CHART_COLORS["lawful-neutral"],
    ALIGNMENT_CELL_CHART_COLORS["true-neutral"],
    ALIGNMENT_CELL_CHART_COLORS["chaotic-neutral"],
  ],
  [
    ALIGNMENT_CELL_CHART_COLORS["lawful-evil"],
    ALIGNMENT_CELL_CHART_COLORS["neutral-evil"],
    ALIGNMENT_CELL_CHART_COLORS["chaotic-evil"],
  ],
];

/** Each card’s accent matches the grid cell where that person is the correct answer. */
export function assignAccentFromAnswerKey<T extends { id: string; accent: string }>(
  palette: T[],
  answerKey: TPlacements,
): T[] {
  const homeAlignmentByPerson = new Map<string, TAlignmentKey>();
  for (const alignment of alignmentOrder) {
    const personId = answerKey[alignment];
    if (personId) {
      homeAlignmentByPerson.set(personId, alignment);
    }
  }

  return palette.map((person) => {
    const slot = homeAlignmentByPerson.get(person.id);
    if (!slot) {
      return person;
    }
    return {
      ...person,
      accent: ALIGNMENT_CELL_CHART_COLORS[slot],
    };
  });
}
