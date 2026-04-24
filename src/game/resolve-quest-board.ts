import { assignAccentFromAnswerKey } from "./card-accent-palette";
import { tryKeywordDemoBoard } from "./demo-boards";
import { fetchQuestBoardFromLlm } from "./quest-llm";
import type { QuestBoard } from "./types";

function withChartAccents(board: QuestBoard): QuestBoard {
  return {
    ...board,
    palette: assignAccentFromAnswerKey(board.palette, board.answerKey),
  };
}

/**
 * Keyword prompts use curated local casts; anything else uses OpenAI (see `questLlm.ts`).
 */
export async function resolveQuestBoard(topic: string): Promise<QuestBoard> {
  const trimmed = topic.trim();
  const keywordBoard = tryKeywordDemoBoard(trimmed);
  if (keywordBoard) {
    return withChartAccents(keywordBoard);
  }
  const generated = await fetchQuestBoardFromLlm(trimmed);
  return withChartAccents(generated);
}
