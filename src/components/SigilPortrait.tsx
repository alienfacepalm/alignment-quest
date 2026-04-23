import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

type Props = {
  monogram: string;
  accent: string;
  size?: number;
};

export function SigilPortrait({ monogram, accent, size = 64 }: Props) {
  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accent,
        },
      ]}
    >
      <View
        style={[
          styles.innerRing,
          {
            borderRadius: (size - 12) / 2,
            width: size - 12,
            height: size - 12,
            backgroundColor: accent,
          },
        ]}
      >
        <Text style={[styles.monogram, { fontSize: Math.max(18, size * 0.32) }]}>
          {monogram}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: colors.ink,
  },
  innerRing: {
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.95,
  },
  monogram: {
    color: colors.parchment,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
});

