import { assignAccentFromAnswerKey } from "./card-accent-palette";
import { tryKeywordDemoBoard } from "./demo-boards";
import { fetchQuestBoardFromLlm } from "./quest-llm";
import type { TQuestBoard } from "./types";

function withChartAccents(board: TQuestBoard): TQuestBoard {
  return {
    ...board,
    palette: assignAccentFromAnswerKey(board.palette, board.answerKey),
  };
}

/**
 * Keyword prompts use curated local casts; anything else uses OpenAI (see `questLlm.ts`).
 */
export async function resolveQuestBoard(
  topic: string,
  opts?: { requiredNames?: string[]; randomSeed?: string; forceLlm?: boolean },
): Promise<TQuestBoard> {
  const trimmed = topic.trim();
  const forceLlm = Boolean(opts?.forceLlm || (opts?.requiredNames?.length ?? 0) > 0);
  const keywordBoard = forceLlm ? null : tryKeywordDemoBoard(trimmed);
  if (keywordBoard) return withChartAccents(keywordBoard);

  const generated = await fetchQuestBoardFromLlm(trimmed, {
    requiredNames: opts?.requiredNames,
    randomSeed: opts?.randomSeed,
  });
  return withChartAccents(generated);
}
