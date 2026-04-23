import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { GamePhase, QuestBoard } from "../game/types";
import { colors, shadow } from "../theme";
import { PortraitCard } from "./PortraitCard";

type Props = {
  board: QuestBoard;
  unplacedPeople: QuestBoard["palette"];
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  phase: GamePhase;
  compact: boolean;
};

export function PalettePanel({
  board,
  unplacedPeople,
  selectedPersonId,
  onSelectPerson,
  phase,
  compact,
}: Props) {
  return (
    <View style={[styles.panel, shadow.panel]}>
      <Text style={styles.panelEyebrow}>Cast</Text>
      <Text style={styles.panelTitle}>{board.title}</Text>
      <Text style={styles.panelBody}>{board.subtitle}</Text>

      <View style={styles.metaStrip}>
        <Text style={styles.metaPill}>{phase === "revealed" ? "Answer key shown" : "Answer key hidden"}</Text>
        <Text style={styles.metaPill}>{unplacedPeople.length} left to place</Text>
      </View>

      <ScrollView
        style={styles.cardsScroller}
        contentContainerStyle={styles.cardsContent}
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
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Cast cleared</Text>
            <Text style={styles.emptyBody}>
              Every card is placed. Hit reveal when you want the verdict.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1.02,
    minWidth: 280,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 26,
    padding: 16,
    gap: 10,
    maxHeight: 960,
  },
  panelEyebrow: {
    color: colors.chaotic,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  panelTitle: {
    color: colors.parchment,
    fontSize: 22,
    fontWeight: "900",
  },
  panelBody: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaPill: {
    backgroundColor: colors.panelRaised,
    color: colors.parchment,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardsScroller: {
    flexGrow: 0,
  },
  cardsContent: {
    gap: 12,
    paddingBottom: 6,
  },
  emptyBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panelRaised,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    color: colors.parchment,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyBody: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
