import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

type Props = {
  personId: string;
  accent: string;
  size?: number;
  accessibilityLabel?: string;
};

function hashPersonId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function initialsFromId(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function SigilPortrait({ personId, accent, size = 64, accessibilityLabel }: Props) {
  const hash = useMemo(() => hashPersonId(personId), [personId]);
  const initials = useMemo(() => initialsFromId(personId), [personId]);
  const rotation = ((hash % 7) - 3) * 6;
  const orbOffset = size * 0.16;
  const glyphSize = Math.max(16, size * 0.34);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          borderColor: accent,
        },
      ]}
    >
      <View
        style={[
          styles.orb,
          {
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size * 0.31,
            top: -orbOffset * 0.2,
            left: -orbOffset * 0.1,
            backgroundColor: `${accent}55`,
          },
        ]}
      />
      <View
        style={[
          styles.spark,
          {
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: size * 0.14,
            right: orbOffset * 0.15,
            bottom: orbOffset * 0.15,
            backgroundColor: colors.brass,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      />
      <View
        style={[
          styles.core,
          {
            width: size * 0.54,
            height: size * 0.54,
            borderRadius: size * 0.18,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: glyphSize }]}>{initials || "?"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: colors.panelRaised,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  orb: {
    position: "absolute",
  },
  spark: {
    position: "absolute",
    opacity: 0.95,
  },
  core: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.16)",
  },
  initials: {
    color: colors.parchment,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
