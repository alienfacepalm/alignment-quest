import React from "react";
import { ScrollView, Text, View } from "react-native";

import { TGamePhase, TQuestBoard } from "../game/types";
import { colors, shadow } from "../theme";
import { PortraitCard } from "./portrait-card";

type TProps = {
  board: TQuestBoard;
  unplacedPeople: TQuestBoard["palette"];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  phase: TGamePhase;
  compact: boolean;
};

export function PalettePanel({
  board,
  unplacedPeople,
  selectedPersonId,
  onSelectPerson,
  phase,
  compact,
}: TProps) {
  return (
    <View
      className="flex-1"
      style={[
        shadow.panel,
        {
          flex: 1.02,
          minWidth: 280,
          maxHeight: 960,
          backgroundColor: colors.panel,
          borderWidth: 1,
          borderColor: colors.panelBorder,
          borderRadius: 26,
          padding: 16,
          gap: 10,
        },
      ]}
    >
      <Text
        className="text-xs font-extrabold uppercase tracking-[1.2px]"
        style={{ color: colors.chaotic }}
      >
        Cast
      </Text>
      <Text className="text-[22px] font-black" style={{ color: colors.parchment }}>
        {board.title}
      </Text>
      <Text className="text-[13px] leading-[19px]" style={{ color: colors.parchmentMuted }}>
        {board.subtitle}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        <Text
          className="overflow-hidden rounded-full px-2.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.5px]"
          style={{ backgroundColor: colors.panelRaised, color: colors.parchment }}
        >
          {phase === "revealed" ? "Answer key shown" : "Answer key hidden"}
        </Text>
        <Text
          className="overflow-hidden rounded-full px-2.5 py-[7px] text-[11px] font-bold uppercase tracking-[0.5px]"
          style={{ backgroundColor: colors.panelRaised, color: colors.parchment }}
        >
          {unplacedPeople.length} left to place
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="gap-3 pb-1.5"
        showsVerticalScrollIndicator={false}
      >
        {unplacedPeople.length ? (
          unplacedPeople.map((person) => (
            <PortraitCard
              key={person.id}
              person={person}
              selected={selectedPersonId === person.id}
              compact={compact}
              onPress={() => onSelectPerson(person.id)}
              footerLabel={selectedPersonId === person.id ? "Selected for placement" : "Tap to select"}
            />
          ))
        ) : (
          <View
            className="gap-1.5 rounded-[18px] border p-[18px]"
            style={{ borderColor: colors.panelBorder, backgroundColor: colors.panelRaised }}
          >
            <Text className="text-[18px] font-extrabold" style={{ color: colors.parchment }}>
              Cast cleared
            </Text>
            <Text className="text-[13px] leading-[19px]" style={{ color: colors.parchmentMuted }}>
              Every card is placed. Hit reveal when you want the verdict.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
