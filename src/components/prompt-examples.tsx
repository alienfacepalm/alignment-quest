import React from "react";
import { Pressable, Text, View } from "react-native";

import { colors } from "../theme";

type TProps = {
  examples: string[];
  activeValue: string;
  onSelect: (value: string) => void;
};

export function PromptExamples({ examples, activeValue, onSelect }: TProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {examples.map((example) => {
        const active = example === activeValue;

        return (
          <Pressable
            key={example}
            onPress={() => onSelect(example)}
            className="rounded-full border px-3 py-2.5"
            style={({ pressed }) => [
              active
                ? { backgroundColor: colors.lawful, borderColor: colors.lawful }
                : { backgroundColor: colors.panelRaised, borderColor: colors.panelBorder },
              pressed ? { opacity: 0.86 } : undefined,
            ]}
          >
            <Text
              className="text-xs font-bold"
              style={{ color: active ? colors.ink : colors.parchment }}
            >
              {example}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
