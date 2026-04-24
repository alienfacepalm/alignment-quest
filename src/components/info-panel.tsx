import React from "react";
import { Pressable, Text, View } from "react-native";

import { getAlignmentLabel } from "../game/demo-boards";
import { TGamePhase, TPersonCard, TPlacements, TQuestBoard, TQuestScore } from "../game/types";
import { colors, shadow } from "../theme";

type TProps = {
  board: TQuestBoard;
  phase: TGamePhase;
  score: TQuestScore | null;
  selectedPerson: TPersonCard | null;
  submittedPlacements: TPlacements | null;
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
      className="items-center justify-center rounded-2xl border px-4 py-[13px]"
      style={({ pressed }) => [
        tone === "secondary"
          ? { backgroundColor: colors.panelRaised, borderColor: colors.panelBorder }
          : { backgroundColor: colors.chaotic, borderColor: colors.chaotic },
        disabled ? { opacity: 0.45 } : undefined,
        pressed && !disabled ? { opacity: 0.86 } : undefined,
      ]}
    >
      <Text
        className="text-sm font-extrabold"
        style={{ color: colors.parchment }}
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
}: TProps) {
  const topMisses = score?.details
    .filter((d) => !d.correct)
    .slice(0, 3);

  return (
    <View
      className="flex-1"
      style={[
        shadow.panel,
        {
          flex: 1,
          minWidth: 280,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.panelBorder,
          borderRadius: 26,
          padding: 16,
          gap: 12,
        },
      ]}
    >
      <Text
        className="text-xs font-extrabold uppercase tracking-[1.1px]"
        style={{ color: colors.ribbon }}
      >
        Quest
      </Text>
      <Text className="text-[22px] font-black" style={{ color: colors.parchment }}>
        Score and details
      </Text>
      <Text className="text-[13px] leading-[19px]" style={{ color: colors.parchmentMuted }}>
        {board.disclaimer}
      </Text>

      <View className="gap-2.5">
        <ActionButton label="Clear picks" onPress={onClearBoard} tone="secondary" disabled={phase !== "sorting"} />
        <ActionButton
          label={phase === "revealed" ? "Play again" : "Score"}
          onPress={phase === "revealed" ? onResetRun : onSubmit}
          disabled={phase !== "revealed" && !canSubmit}
        />
      </View>

      {selectedPerson ? (
        <View
          className="gap-2 rounded-[18px] border p-4"
          style={{ backgroundColor: colors.panelRaised, borderColor: colors.panelBorder }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-[0.8px]"
            style={{ color: colors.verdigris }}
          >
            Now reading
          </Text>
          <Text className="text-[18px] font-extrabold" style={{ color: colors.parchment }}>
            {selectedPerson.name}
          </Text>
          <Text className="text-xs" style={{ color: colors.parchmentMuted }}>
            {selectedPerson.role}
          </Text>
          <Text className="text-sm leading-[21px]" style={{ color: colors.parchment }}>
            {selectedPerson.rationale}
          </Text>
        </View>
      ) : (
        <View
          className="gap-2 rounded-[18px] border p-4"
          style={{ backgroundColor: colors.panelRaised, borderColor: colors.panelBorder }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-[0.8px]"
            style={{ color: colors.verdigris }}
          >
            Now reading
          </Text>
          <Text className="text-sm leading-[21px]" style={{ color: colors.parchment }}>
            Select a card, then tap a cell to place it. One point for each person on the right alignment.
          </Text>
        </View>
      )}

      {score ? (
        <View
          className="gap-3 rounded-[18px] border p-4"
          style={{ backgroundColor: colors.panelRaised, borderColor: colors.panelBorder }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-[0.8px]"
            style={{ color: colors.brass }}
          >
            Score
          </Text>
          <Text
            className="text-[42px] font-black leading-[44px]"
            style={{ color: colors.brassBright }}
          >
            {score.points} / 9
          </Text>
          <Text className="text-sm leading-[21px]" style={{ color: colors.parchment }}>
            Each exact match = 1 point.
          </Text>

          {topMisses && topMisses.length > 0 ? (
            <View className="gap-2.5">
              {topMisses.map((detail) => {
                const person = board.palette.find((entry) => entry.id === detail.personId);
                if (!person) {
                  return null;
                }
                return (
                  <View
                    key={`${detail.alignment}-${detail.personId}`}
                    className="gap-1.5 rounded-2xl bg-white/5 p-3"
                  >
                    <Text className="text-[13px] font-extrabold" style={{ color: colors.parchment }}>
                      {person.name}
                    </Text>
                    <Text className="text-[13px] leading-[18px]" style={{ color: colors.parchmentMuted }}>
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
        <View
          className="gap-3 rounded-[18px] border p-4"
          style={{ backgroundColor: colors.panelRaised, borderColor: colors.panelBorder }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-[0.8px]"
            style={{ color: colors.brass }}
          >
            Scoring
          </Text>
          <Text className="text-sm leading-[21px]" style={{ color: colors.parchment }}>
            1 point per person on their correct alignment (max 9 per quest).
          </Text>
        </View>
      )}

      {phase === "revealed" && submittedPlacements ? (
        <View
          className="gap-1.5 rounded-[18px] border p-[14px]"
          style={{ backgroundColor: "rgba(83, 167, 255, 0.09)", borderColor: colors.ribbon }}
        >
          <Text
            className="text-[11px] font-bold uppercase tracking-[0.8px]"
            style={{ color: colors.brass }}
          >
            Note
          </Text>
          <Text className="text-[13px] leading-[19px]" style={{ color: colors.parchment }}>
            Placements are a playful house ruling for this run, not a factual judgment.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
