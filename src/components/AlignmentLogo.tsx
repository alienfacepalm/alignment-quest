import React, { useMemo } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors } from "../theme";

type Props = {
  size?: number;
};

/** Nine-cell alignment grid mark — lawful→chaotic, good→evil color hints. */
const GRID: string[][] = [
  [colors.lawful, colors.moss, colors.chaotic],
  [colors.lawful, colors.neutral, colors.chaotic],
  [colors.lawful, colors.evil, colors.chaotic],
];

const OUTER = 3;
const GAP = 1.5;

export function AlignmentLogo({ size = 40 }: Props) {
  const { cell, inner } = useMemo(() => {
    const innerSize = size - OUTER * 2;
    const c = (innerSize - GAP * 2) / 3;
    return { cell: c, inner: innerSize };
  }, [size]);

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: Math.max(8, size * 0.22), padding: OUTER },
      ]}
    >
      <View style={{ width: inner, height: inner, gap: GAP }}>
        {GRID.map((row, ri) => (
          <View key={ri} style={[styles.row, { width: inner, height: cell, gap: GAP } as ViewStyle]}>
            {row.map((bg, ci) => (
              <View key={ci} style={[styles.cell, { width: cell, height: cell, backgroundColor: bg }]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#0a0a0c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    borderRadius: 2.5,
  },
});
