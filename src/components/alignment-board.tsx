import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getAlignmentLabel } from "../game/demo-boards";
import { alignmentOrder, AlignmentKey, GamePhase, Placements, QuestBoard } from "../game/types";
import { colors, shadow } from "../theme";
import { PortraitCard } from "./portrait-card";

type Props = {
  board: QuestBoard;
  phase: GamePhase;
  placements: Placements;
  submittedPlacements: Placements | null;
  selectedPersonId: string | null;
  onPlace: (alignment: AlignmentKey) => void;
  onSelectPlacedPerson: (personId: string) => void;
  onClearCell: (alignment: AlignmentKey) => void;
  compact: boolean;
};

export function AlignmentBoard({
  board,
  phase,
  placements,
  submittedPlacements,
  selectedPersonId,
  onPlace,
  onSelectPlacedPerson,
  onClearCell,
  compact,
}: Props) {
  const peopleById = Object.fromEntries(board.palette.map((person) => [person.id, person]));

  return (
    <View style={[styles.panel, shadow.panel]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Board</Text>
          <Text style={styles.title}>Drop the cast into the chaos chart</Text>
        </View>
        <Text style={styles.instructions}>
          Tap a card, tap a square, and keep going until the grid feels right.
        </Text>
      </View>

      <View style={styles.grid}>
        {alignmentOrder.map((alignment) => {
          const personId = placements[alignment];
          const person = personId ? peopleById[personId] : null;
          const submittedPersonId = submittedPlacements?.[alignment] ?? null;
          const guessedCorrectly = submittedPersonId === board.answerKey[alignment];

          return (
            <Pressable
              key={alignment}
              onPress={() => {
                if (selectedPersonId && phase === "sorting" && personId === selectedPersonId) {
                  onClearCell(alignment);
                  return;
                }

                if (selectedPersonId && phase === "sorting") {
                  onPlace(alignment);
                  return;
                }

                if (personId) {
                  if (phase === "sorting") {
                    onSelectPlacedPerson(personId);
                  } else {
                    onSelectPlacedPerson(personId);
                  }
                }
              }}
              style={({ pressed }) => [
                styles.cell,
                person ? styles.cellFilled : styles.cellEmpty,
                phase === "revealed" && guessedCorrectly ? styles.cellCorrect : undefined,
                phase === "revealed" && submittedPersonId && !guessedCorrectly
                  ? styles.cellReveal
                  : undefined,
                pressed ? styles.cellPressed : undefined,
              ]}
            >
              <View style={styles.cellHeader}>
                <Text style={styles.cellLabel}>{getAlignmentLabel(alignment)}</Text>
                {phase === "sorting" && !person ? (
                  <Text style={styles.cellHint}>Place</Text>
                ) : null}
                {phase === "revealed" ? (
                  <Text style={[styles.resultBadge, guessedCorrectly ? styles.resultBadgeGood : styles.resultBadgeMiss]}>
                    {guessedCorrectly ? "Exact" : "Reveal"}
                  </Text>
                ) : null}
              </View>

              {person ? (
                <PortraitCard
                  person={person}
                  compact={compact}
                  selected={selectedPersonId === person.id}
                  footerLabel={
                    phase === "revealed"
                      ? `AI confidence ${Math.round(person.confidence * 100)}%`
                      : "Placed"
                  }
                />
              ) : (
                <View style={styles.emptyCellBody}>
                  <Text style={styles.emptyCellBodyText}>
                    {phase === "sorting"
                      ? "Awaiting verdict"
                      : "Empty in submitted board"}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1.4,
    minWidth: 320,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 28,
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: colors.verdigris,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  title: {
    color: colors.parchment,
    fontSize: 22,
    fontWeight: "900",
  },
  instructions: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    gap: 12,
  },
  cell: {
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  cellEmpty: {
    borderColor: colors.panelBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  cellFilled: {
    borderColor: colors.panelBorder,
    backgroundColor: colors.panelRaised,
  },
  cellCorrect: {
    borderColor: colors.good,
    backgroundColor: "rgba(98, 229, 140, 0.08)",
  },
  cellReveal: {
    borderColor: colors.brass,
    backgroundColor: "rgba(255, 216, 77, 0.08)",
  },
  cellPressed: {
    opacity: 0.92,
  },
  cellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cellLabel: {
    color: colors.parchment,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cellHint: {
    color: colors.parchmentMuted,
    fontSize: 12,
  },
  resultBadge: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultBadgeGood: {
    backgroundColor: colors.good,
    color: colors.ink,
  },
  resultBadgeMiss: {
    backgroundColor: colors.ribbon,
    color: colors.parchment,
  },
  emptyCellBody: {
    minHeight: 88,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  emptyCellBodyText: {
    color: colors.parchmentMuted,
    fontSize: 13,
  },
});
