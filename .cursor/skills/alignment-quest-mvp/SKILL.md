---
name: alignment-quest-mvp
description: >-
  Working on the dnd-game Alignment Quest MVP—9-person deck, hidden answer key, 1 point per exact match, game logic in src/game.
---

# Alignment Quest MVP

## When to use

Use when editing this repo’s alignment quest: `App.tsx`, `src/game/*`, or placement / reveal UX.

## Product rules

1. **Deck**: Exactly **9** `PersonCard` entries per quest, one per alignment cell in the 3×3 grid.
2. **Truth**: `QuestBoard.answerKey` maps each `AlignmentKey` → person `id`. Players never see it until after submit (reveal may show the key on the board per cell).
3. **Score**: `QuestScore.points` = number of cells where the player’s guess id equals `answerKey[alignment]`. No other scoring dimensions in MVP.

## Code layout

- **`src/game/demoBoards.ts`**: `generateBoard(prompt)` picks a curated cast by keyword; builds `answerKey` from each card’s `alignment`.
- **`src/game/scoring.ts`**: `createEmptyPlacements`, `scorePlacements({ answerKey, guesses })`.
- **`src/game/types.ts`**: `QuestBoard`, `QuestScore`, `Placements`, `PersonCard`.
- **UI** should not embed scoring rules; call `scorePlacements` on submit.

## Checklist before shipping a change

- [ ] `npx tsc --noEmit` passes
- [ ] New quest still produces 9 cards and a full `answerKey`
- [ ] Submit is disabled until all 9 cells are filled
- [ ] Reveal shows match count 0–9 and does not add non-MVP systems
