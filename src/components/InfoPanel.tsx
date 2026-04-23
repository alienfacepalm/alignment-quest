import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getAlignmentLabel } from "../game/demoBoards";
import { GamePhase, PersonCard, Placements, QuestBoard, QuestScore } from "../game/types";
import { colors, shadow } from "../theme";

type Props = {
  board: QuestBoard;
  phase: GamePhase;
  score: QuestScore | null;
  selectedPerson: PersonCard | null;
  submittedPlacements: Placements | null;
  onClearBoard: () => void;
  onSubmit: () => void;
  onResetRun: () => void;
  canSubmit: boolean;
};

function ActionButton({
  label,
  onPress,
  tone = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        tone === "secondary" ? styles.actionButtonSecondary : styles.actionButtonPrimary,
        disabled ? styles.actionButtonDisabled : undefined,
        pressed && !disabled ? styles.actionButtonPressed : undefined,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          tone === "secondary" ? styles.actionButtonTextSecondary : styles.actionButtonTextPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function InfoPanel({
  board,
  phase,
  score,
  selectedPerson,
  submittedPlacements,
  onClearBoard,
  onSubmit,
  onResetRun,
  canSubmit,
}: Props) {
  const topMisses = score?.details
    .filter((d) => !d.correct)
    .slice(0, 3);

  return (
    <View style={[styles.panel, shadow.panel]}>
      <Text style={styles.eyebrow}>Quest</Text>
      <Text style={styles.title}>Score and details</Text>
      <Text style={styles.body}>{board.disclaimer}</Text>

      <View style={styles.buttonStack}>
        <ActionButton label="Clear picks" onPress={onClearBoard} tone="secondary" disabled={phase !== "sorting"} />
        <ActionButton
          label={phase === "revealed" ? "Play again" : "Score"}
          onPress={phase === "revealed" ? onResetRun : onSubmit}
          disabled={phase !== "revealed" && !canSubmit}
        />
      </View>

      {selectedPerson ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailEyebrow}>Now reading</Text>
          <Text style={styles.detailTitle}>{selectedPerson.name}</Text>
          <Text style={styles.detailRole}>{selectedPerson.role}</Text>
          <Text style={styles.detailText}>{selectedPerson.rationale}</Text>
        </View>
      ) : (
        <View style={styles.detailCard}>
          <Text style={styles.detailEyebrow}>Now reading</Text>
          <Text style={styles.detailText}>
            Select a card, then tap a cell to place it. One point for each person on the right alignment.
          </Text>
        </View>
      )}

      {score ? (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreEyebrow}>Score</Text>
          <Text style={styles.scoreTotal}>
            {score.points} / 9
          </Text>
          <Text style={styles.scorePreview}>Each exact match = 1 point.</Text>

          {topMisses && topMisses.length > 0 ? (
            <View style={styles.revealList}>
              {topMisses.map((detail) => {
                const person = board.palette.find((entry) => entry.id === detail.personId);
                if (!person) {
                  return null;
                }
                return (
                  <View key={`${detail.alignment}-${detail.personId}`} style={styles.revealRow}>
                    <Text style={styles.revealName}>{person.name}</Text>
                    <Text style={styles.revealBody}>
                      You placed them on {getAlignmentLabel(detail.alignment)}; correct was{" "}
                      {getAlignmentLabel(detail.correctAlignment)}.
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.scoreCard}>
          <Text style={styles.scoreEyebrow}>Scoring</Text>
          <Text style={styles.scorePreview}>
            1 point per person on their correct alignment (max 9 per quest).
          </Text>
        </View>
      )}

      {phase === "revealed" && submittedPlacements ? (
        <View style={styles.auditCard}>
          <Text style={styles.auditEyebrow}>Note</Text>
          <Text style={styles.auditText}>
            Placements are a playful house ruling for this run, not a factual judgment.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 26,
    padding: 16,
    gap: 12,
  },
  eyebrow: {
    color: colors.ribbon,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "800",
  },
  title: {
    color: colors.parchment,
    fontSize: 22,
    fontWeight: "900",
  },
  body: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  buttonStack: {
    gap: 10,
  },
  actionButton: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: colors.chaotic,
    borderColor: colors.chaotic,
  },
  actionButtonSecondary: {
    backgroundColor: colors.panelRaised,
    borderColor: colors.panelBorder,
  },
  actionButtonTextPrimary: {
    color: colors.parchment,
  },
  actionButtonTextSecondary: {
    color: colors.parchment,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    opacity: 0.86,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  detailCard: {
    backgroundColor: colors.panelRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 16,
    gap: 8,
  },
  detailEyebrow: {
    color: colors.verdigris,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  detailTitle: {
    color: colors.parchment,
    fontSize: 18,
    fontWeight: "800",
  },
  detailRole: {
    color: colors.parchmentMuted,
    fontSize: 12,
  },
  detailText: {
    color: colors.parchment,
    fontSize: 14,
    lineHeight: 21,
  },
  scoreCard: {
    backgroundColor: colors.panelRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 16,
    gap: 12,
  },
  scoreEyebrow: {
    color: colors.brass,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  scoreTotal: {
    color: colors.brassBright,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 44,
  },
  scorePreview: {
    color: colors.parchment,
    fontSize: 14,
    lineHeight: 21,
  },
  revealList: {
    gap: 10,
  },
  revealRow: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  revealName: {
    color: colors.parchment,
    fontSize: 13,
    fontWeight: "800",
  },
  revealBody: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  auditCard: {
    backgroundColor: "rgba(83, 167, 255, 0.09)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.ribbon,
    padding: 14,
    gap: 6,
  },
  auditEyebrow: {
    color: colors.brass,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  auditText: {
    color: colors.parchment,
    fontSize: 13,
    lineHeight: 19,
  },
});
