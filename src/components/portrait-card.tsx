import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PersonCard } from "../game/types";
import { colors, shadow } from "../theme";
import { SigilPortrait } from "./sigil-portrait";

type Props = {
  person: PersonCard;
  selected?: boolean;
  compact?: boolean;
  onPress?: () => void;
  footerLabel?: string;
};

export function PortraitCard({
  person,
  selected = false,
  compact = false,
  onPress,
  footerLabel,
}: Props) {
  const body = (
    <View
      style={[
        styles.card,
        shadow.card,
        selected ? styles.cardSelected : undefined,
        compact ? styles.cardCompact : undefined,
      ]}
    >
      <View style={styles.headerRow}>
        <SigilPortrait
          personId={person.id}
          accent={person.accent}
          size={compact ? 54 : 62}
          accessibilityLabel={person.name}
          portraitUri={person.portraitUri}
        />
        <View style={styles.identityBlock}>
          <Text style={styles.name}>{person.name}</Text>
          <Text style={styles.role}>{person.role}</Text>
        </View>
      </View>

      <View style={styles.tagRow}>
        {person.clueTags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      {footerLabel ? <Text style={styles.footerLabel}>{footerLabel}</Text> : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.cardPressed : undefined)}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 14,
    backgroundColor: colors.panelRaised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: 14,
  },
  cardCompact: {
    padding: 12,
  },
  cardSelected: {
    borderColor: colors.selected,
    backgroundColor: "#342a62",
  },
  cardPressed: {
    opacity: 0.9,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  identityBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.parchment,
    fontSize: 16,
    fontWeight: "800",
  },
  role: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 17,
  },
  tagRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.parchmentMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  footerLabel: {
    color: colors.brassBright,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
