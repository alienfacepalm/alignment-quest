import React from "react";
import { Pressable, Text, View } from "react-native";

import { getAlignmentLabel } from "../game/demo-boards";
import { alignmentOrder, TAlignmentKey, TGamePhase, TPlacements, TQuestBoard } from "../game/types";
import { colors, shadow } from "../theme";
import { PortraitCard } from "./portrait-card";

type TProps = {
  board: TQuestBoard;
  phase: TGamePhase;
  placements: TPlacements;
  submittedPlacements: TPlacements | null;
  selectedPersonId: string | null;
  onPlace: (alignment: TAlignmentKey) => void;
  onSelectPlacedPerson: (personId: string) => void;
  onClearCell: (alignment: TAlignmentKey) => void;
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
}: TProps) {
  const peopleById = Object.fromEntries(board.palette.map((person) => [person.id, person]));

  return (
    <View
      className="flex-1"
      style={[
        shadow.panel,
        {
          flex: 1.4,
          minWidth: 320,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.panelBorder,
          borderRadius: 28,
          padding: 16,
          gap: 12,
        },
      ]}
    >
      <View className="gap-2">
        <View>
          <Text
            className="text-xs font-extrabold uppercase tracking-[1.2px]"
            style={{ color: colors.verdigris }}
          >
            Board
          </Text>
          <Text className="text-[22px] font-black" style={{ color: colors.parchment }}>
            Drop the cast into the chaos chart
          </Text>
        </View>
        <Text className="text-[13px] leading-[18px]" style={{ color: colors.parchmentMuted }}>
          Tap a card, tap a square, and keep going until the grid feels right.
        </Text>
      </View>

      <View className="gap-3">
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
              className="gap-2 rounded-[18px] border p-[10px]"
              style={({ pressed }) => [
                person
                  ? { borderColor: colors.panelBorder, backgroundColor: colors.panelRaised }
                  : { borderColor: colors.panelBorder, backgroundColor: "rgba(255,255,255,0.04)" },
                phase === "revealed" && guessedCorrectly
                  ? { borderColor: colors.good, backgroundColor: "rgba(98, 229, 140, 0.08)" }
                  : undefined,
                phase === "revealed" && submittedPersonId && !guessedCorrectly
                  ? { borderColor: colors.brass, backgroundColor: "rgba(255, 216, 77, 0.08)" }
                  : undefined,
                pressed ? { opacity: 0.92 } : undefined,
              ]}
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text
                  className="text-xs font-extrabold uppercase tracking-[0.4px]"
                  style={{ color: colors.parchment }}
                >
                  {getAlignmentLabel(alignment)}
                </Text>
                {phase === "sorting" && !person ? (
                  <Text className="text-xs" style={{ color: colors.parchmentMuted }}>
                    Place
                  </Text>
                ) : null}
                {phase === "revealed" ? (
                  <Text
                    className="overflow-hidden rounded-full px-[10px] py-[6px] text-[11px] font-extrabold uppercase tracking-[0.5px]"
                    style={
                      guessedCorrectly
                        ? { backgroundColor: colors.good, color: colors.ink }
                        : { backgroundColor: colors.ribbon, color: colors.parchment }
                    }
                  >
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
                <View
                  className="min-h-[88px] items-center justify-center rounded-[16px] border p-[14px]"
                  style={{
                    borderColor: colors.panelBorder,
                    backgroundColor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Text className="text-[13px]" style={{ color: colors.parchmentMuted }}>
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
