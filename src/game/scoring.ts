import { TAlignmentKey, TPlacements, TQuestGuessDetail, TQuestScore, alignmentOrder } from "./types";

type TScoreInput = {
  answerKey: TPlacements;
  guesses: TPlacements;
};

function findCorrectAlignment(answerKey: TPlacements, personId: string): TAlignmentKey {
  for (const alignment of alignmentOrder) {
    if (answerKey[alignment] === personId) {
      return alignment;
    }
  }

  {
    throw new Error(`Missing answer key for person ${personId}`);
  }
}

export function createEmptyPlacements(): TPlacements {
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
export function scorePlacements(input: TScoreInput): TQuestScore {
  const details: TQuestGuessDetail[] = Object.entries(input.guesses)
    .filter((entry): entry is [TAlignmentKey, string] => Boolean(entry[1]))
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
