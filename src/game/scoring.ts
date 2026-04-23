import { AlignmentKey, Placements, QuestGuessDetail, QuestScore } from "./types";

type ScoreInput = {
  answerKey: Placements;
  guesses: Placements;
};

function findCorrectAlignment(answerKey: Placements, personId: string): AlignmentKey {
  const match = Object.entries(answerKey).find(([, id]) => id === personId)?.[0];

  if (!match) {
    throw new Error(`Missing answer key for person ${personId}`);
  }

  return match as AlignmentKey;
}

export function createEmptyPlacements(): Placements {
  return {
    "lawful-good": null,
    "neutral-good": null,
    "chaotic-good": null,
    "lawful-neutral": null,
    "true-neutral": null,
    "chaotic-neutral": null,
    "lawful-evil": null,
    "neutral-evil": null,
    "chaotic-evil": null,
  };
}

/** MVP: 1 point per person placed on their correct alignment (max 9). */
export function scorePlacements(input: ScoreInput): QuestScore {
  const details: QuestGuessDetail[] = Object.entries(input.guesses)
    .filter((entry): entry is [AlignmentKey, string] => Boolean(entry[1]))
    .map(([alignment, personId]) => {
      const correctAlignment = findCorrectAlignment(input.answerKey, personId);
      const correct = alignment === correctAlignment;
      return { alignment, personId, correct, correctAlignment };
    });

  const exactMatches = details.filter((d) => d.correct).length;

  return {
    points: exactMatches,
    exactMatches,
    details,
  };
}
