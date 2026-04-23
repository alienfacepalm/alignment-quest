# Alignment Draft

Browser game concept and core-loop plan for an AI-generated D&D alignment puzzle.

## One-Line Pitch

The player enters a theme such as "Trump administration," the AI secretly assigns nine people to the nine D&D alignments, and the player drags portrait cards onto a 3x3 alignment board to guess the AI's hidden chart before the reveal.

## Why This Works

- The board is instantly legible because most players already understand the 3x3 alignment meme format.
- Prompt-driven rosters make the game endlessly replayable.
- The reveal phase creates debate, surprise, and shareable moments.
- Portrait cards and alignment labels make the puzzle readable in seconds.

## Design Pillars

1. Fast to learn: the player should understand the goal in under 15 seconds.
2. Debate-friendly: the fun is comparing the player's read to the AI's read.
3. Explainable: every reveal needs a short rationale, not just a verdict.
4. Toy first, quiz second: the tone should feel playful and provocative, not like a moral truth engine.
5. Promptable: the same loop should work for politics, sports, pop culture, history, and fictional casts.

## Player Fantasy

The player is acting like a cosmic dungeon master, sorting a cast of recognizable personalities into a moral-lawfulness grid and then checking whether their intuition matches the AI tribunal's board.

## Core Session Length

- Target session: 3 to 5 minutes
- Ideal repeat pattern: 2 to 4 boards in one sitting
- First meaningful interaction: under 10 seconds from load

## Core Loop

1. Enter a theme.
   Example: "Create a new chart for the Trump administration."
2. Generate the cast.
   The backend resolves the theme, gathers candidate people and portraits, and asks the model to produce a hidden nine-cell board.
3. Read the clues.
   The player sees a palette of portrait cards with names, roles, and two or three short clue tags.
4. Place the cards.
   The player drags or taps each card into one of the nine alignment cells.
5. Lock the board.
   Once all nine cells are filled, the player submits.
6. Reveal the AI board.
   Correct cards stay put, wrong cards animate to the AI's positions, and each card shows the model's rationale.
7. Score and reflect.
   The game awards points for exact matches and near misses, then invites replay, remix, or sharing.

## State Machine

`idle -> theme_input -> generate_board -> sort_phase -> submit -> reveal -> score -> replay`

### `idle`
- Shows title, sample prompts, and recent boards.
- CTA: `Generate a Board`

### `theme_input`
- Free-text prompt field and quick-pick chips.
- Examples: `Trump administration`, `OpenAI leadership`, `Shakespeare villains`, `Fast food mascots`

### `generate_board`
- Backend resolves the topic, selects nine people, fetches portraits, validates the board, and returns a play pack.
- Client shows progress steps: `Resolving cast`, `Judging alignments`, `Preparing cards`

### `sort_phase`
- Main gameplay state.
- The user can drag, swap, inspect clues, undo, clear, or request one hint.

### `submit`
- Server records the final placement and requests the reveal payload.

### `reveal`
- Board animates the answer key.
- Each card displays a short explanation and confidence score.
- The player can step through one card at a time or reveal all.

### `score`
- Shows score breakdown, best guesses, biggest misses, and optional share card.

### `replay`
- Offers `Same theme, new board`, `New theme`, and `Challenge a friend`.

## MVP Rules

- Exactly nine people per board.
- Exactly one person per alignment cell.
- Every board must be solvable from clues, even if the AI's logic is subjective.
- The player cannot submit until all nine cells are filled.
- The AI must provide a short rationale for every hidden placement.
- The system should reject low-confidence or weakly sourced boards and regenerate them.

## Scoring

Recommended MVP scoring:

- Exact cell match: 100 points
- Correct law-chaos axis but wrong moral axis: 35 points
- Correct good-evil axis but wrong lawfulness axis: 35 points
- Perfect board bonus: 300 points
- No-hint bonus: 100 points
- Fast finish bonus: up to 100 points

This gives partial credit without making wrong boards feel hopeless.

## Hint System

One optional hint per run keeps the board approachable.

- Hint 1: reveal one candidate's strongest axis only, such as `leans lawful`
- Penalty: minus 75 points
- Rule: no second hint in MVP

## UI Direction

### Visual Theme

Use an "illuminated dossier" look instead of a flat meme generator.

- Background: dark felt table with parchment overlays and faint occult geometry.
- Board: hand-inked 3x3 sigil grid with brass corner pins.
- Cards: dossier portraits with wax-seal rarity accents.
- Motion: card snaps, ink-bloom reveals, subtle score stamp effects.

### Typography

- Headings: `Cinzel` or `Cormorant SC`
- UI/body: `IBM Plex Sans` or `Source Sans 3`
- Alignment labels: all-caps engraved treatment

### Color System

- `--bg-obsidian: #161311`
- `--bg-felt: #1f2b26`
- `--panel-parchment: #e7d8b2`
- `--accent-brass: #c29a52`
- `--accent-oxblood: #7b2f2b`
- `--accent-verdigris: #3b7f77`
- `--ink: #241b16`

This should feel like a fantasy tribunal table, not a productivity app.

## Layout

### Desktop

```text
+---------------------------------------------------------------+
| Alignment Draft | Theme input | Generate | Daily | Profile    |
+---------------------------+-------------------+---------------+
| Palette / active clues    |   3x3 board       | Score / hint  |
| [portrait cards stack]    | [LG][NG][CG]      | Legend        |
| [hover card details]      | [LN][TN][CN]      | Run status    |
| [filter by role/source]   | [LE][NE][CE]      | Reveal log    |
+---------------------------+-------------------+---------------+
| Bottom drawer: rationale history / share card / regenerate    |
+---------------------------------------------------------------+
```

### Mobile

- Put the 3x3 board first.
- Collapse the palette into a horizontal card rail below the board.
- Use tap-to-select then tap-to-place as the default interaction, with drag as an enhancement.
- Move long explanations into a bottom sheet.

## Recommended Stack

For this specific game, a DOM-first stack is stronger than a Phaser-first stack.

### Client

- React + TypeScript
- Vite for fast iteration, or Next.js if you want one full-stack app from day one
- `dnd-kit` for drag and drop
- `zustand` or `xstate` for simulation state
- CSS modules or Tailwind plus a custom theme token layer

### Server

- TypeScript API layer
- One board-generation endpoint
- One reveal endpoint
- One image-cache endpoint or background job

### Why not Phaser for MVP?

The primary verbs are drag, inspect, compare, and reveal. This is a card-and-grid puzzle with text-heavy explanations, so DOM accessibility and layout control matter more than sprite rendering. Phaser can still be added later for more theatrical transitions or event modes, but it is not the strongest foundation for the first playable.

## System Boundaries

### Simulation Layer

Owns:
- board state
- player placements
- score calculation
- hints used
- timer
- reveal state
- replay seed

### UI Layer

Owns:
- card drag and placement animations
- responsive layout
- hover and tap interactions
- clue drawer
- reveal panels

### Backend Layer

Owns:
- theme resolution
- candidate retrieval
- portrait resolution
- AI board generation
- validation and moderation
- caching

## Content Pipeline

### 1. Theme Resolver

Input: free-text theme prompt.

Output:
- normalized board title
- entity type
- source strategy
- safety flags
- candidate search terms

Example:
- Prompt: `Trump administration`
- Normalized type: `current_us_administration`
- Strategy: `official_roster_first`

### 2. Candidate Gatherer

Collect 12 to 20 possible candidates before the final nine are chosen.

Priority order:
1. official roster pages when the topic has them
2. official portrait or public-domain sources
3. permissive commons sources with attribution
4. generated fallback portraits when real images are missing or unsafe to reuse

### 3. Portrait Resolver

For each candidate:
- fetch portrait URL
- cache thumbnail
- crop or frame to a consistent card ratio
- store source and attribution
- if missing, generate a stylized fallback card portrait

Fallback art should be obviously game-styled, not an attempt at a deceptive photoreal replacement.

### 4. Board Judge

The model receives the validated candidate pool and must:
- choose exactly nine people
- assign one unique person to each alignment cell
- produce 2 to 3 clue tags per person
- produce a short rationale per person
- return confidence for each choice

### 5. Validator

Reject and regenerate if:
- any alignment cell is duplicated or empty
- fewer than nine usable portraits exist
- a rationale relies on unsupported allegations
- confidence is below threshold for too many entries
- too many picks are obscure or irrelevant to the prompt

### 6. Packager

Return two payloads:

- `playPack`: safe for the client during the guessing phase
- `revealPack`: hidden until submit

The client should not receive hidden alignments in the initial payload.

## Data Contract

```json
{
  "boardId": "board_2026_04_23_trump_admin_a1",
  "title": "Trump Administration Alignment Chart",
  "themePrompt": "Trump administration",
  "palette": [
    {
      "id": "scott-bessent",
      "name": "Scott Bessent",
      "role": "Secretary of the Treasury",
      "image": {
        "kind": "remote",
        "url": "https://...",
        "attribution": "The White House"
      },
      "clueTags": ["institutionalist", "markets", "measured"],
      "sourceLinks": ["https://..."]
    }
  ],
  "rules": {
    "hintPenalty": 75,
    "perfectBonus": 300,
    "timeBonusMax": 100
  }
}
```

Hidden reveal payload example:

```json
{
  "boardId": "board_2026_04_23_trump_admin_a1",
  "placements": {
    "lawful-good": "person_a",
    "neutral-good": "person_b",
    "chaotic-good": "person_c",
    "lawful-neutral": "person_d",
    "true-neutral": "person_e",
    "chaotic-neutral": "person_f",
    "lawful-evil": "person_g",
    "neutral-evil": "person_h",
    "chaotic-evil": "person_i"
  },
  "rationales": {
    "person_a": "Short explanation grounded in public role and behavior.",
    "person_b": "Short explanation grounded in public role and behavior."
  },
  "confidence": {
    "person_a": 0.77,
    "person_b": 0.68
  }
}
```

## AI Prompting Rules

System prompt goals:
- treat the board as a playful, subjective game output
- avoid presenting alignments as objective fact
- ground rationales in public roles, rhetoric, or visible behavior patterns
- avoid allegations, mental-state claims, or criminal assertions unless directly sourced and necessary
- always fill all nine cells exactly once
- prefer recognizable figures over obscure staffers for playability

Suggested generation instruction:

```text
Create a 9-person alignment puzzle board from the candidate pool.
Use each D&D alignment exactly once.
Optimize for recognizability, variety of roles, and interesting player debate.
Return short clue tags and a brief rationale for each pick.
Treat labels as playful, subjective interpretations for a game, not factual judgments.
Avoid unsupported allegations or private-person inferences.
```

## Trump Administration Example Flow

1. The player types `Trump administration`.
2. The backend resolves the prompt to a current White House roster strategy.
3. The gatherer pulls recognizable administration figures and their official portraits when available.
4. The model selects the final nine and secretly maps them to the nine alignments.
5. The player receives the portrait palette and begins sorting.
6. On reveal, each card shows the AI's alignment plus a one-sentence reason.

The important product choice is that the game is testing the player's ability to predict the AI's board, not claiming that the board is morally correct.

## Safety and Product Guardrails

This concept can be fun, but public-figure boards need clear framing.

- Label boards as `AI interpretation` or `House ruling`, not truth.
- Show a short disclaimer on generation for public-figure themes.
- Keep explanations short and evidence-aware.
- Prefer public figures over private individuals.
- Allow a safer default set of fictional, historical, and entertainment categories.
- Provide a `Regenerate Board` option if the cast feels weak.
- Provide a `Hide explanations until after scoring` toggle for streamers.

## Progression Ideas

- Daily Board: one official curated prompt each day
- Streaks: consecutive boards completed without hints
- Draft Mode: player chooses 9 from a pool of 15 before sorting
- Versus Mode: two players try to match the same hidden board
- Community Remix: replay another player's saved prompt and seed

## First Playable Milestones

### Milestone 1: Paper Prototype
- hard-coded 9-person sample board
- local portrait assets
- drag and drop board
- reveal animation
- scoring

### Milestone 2: Live Prompt Generation
- theme input field
- server-generated play pack
- cached portrait loading
- validation and retry loop

### Milestone 3: Explanation Layer
- per-card rationales
- confidence display
- shareable results card

### Milestone 4: Replayability
- daily challenge
- seed-based remixes
- versus and leaderboard hooks

## Success Metrics

- time to first placement under 20 seconds
- average completion rate above 75%
- at least one replay per completed board in early testing
- reveal screen share rate above 15%
- low rate of user complaints about irrelevant or obscure casts

## Best Next Step

Build Milestone 1 as a vertical slice with one static board and fake reveal data. Once the sort-reveal loop feels great, wire in live AI generation and image sourcing.
