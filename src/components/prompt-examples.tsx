import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

type Props = {
  examples: string[];
  activeValue: string;
  onSelect: (value: string) => void;
};

export function PromptExamples({ examples, activeValue, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      {examples.map((example) => {
        const active = example === activeValue;

        return (
          <Pressable
            key={example}
            onPress={() => onSelect(example)}
            style={({ pressed }) => [
              styles.chip,
              active ? styles.chipActive : undefined,
              pressed ? styles.chipPressed : undefined,
            ]}
          >
            <Text style={[styles.chipText, active ? styles.chipTextActive : undefined]}>
              {example}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.panelRaised,
  },
  chipActive: {
    backgroundColor: colors.lawful,
    borderColor: colors.lawful,
  },
  chipPressed: {
    opacity: 0.86,
  },
  chipText: {
    color: colors.parchment,
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: colors.ink,
  },
});
