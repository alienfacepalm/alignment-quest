import React, { useMemo } from "react";
import { View, type ViewStyle } from "react-native";

import { ALIGNMENT_CHART_GRID_ROWS } from "../game/card-accent-palette";

type TProps = {
  size?: number;
};

/** Nine-cell alignment mark — same slot palette as the play grid. */
const GRID = ALIGNMENT_CHART_GRID_ROWS;

const OUTER = 3;
const GAP = 1.5;

export function AlignmentLogo({ size = 40 }: TProps) {
  const { cell, inner } = useMemo(() => {
    const innerSize = size - OUTER * 2;
    const c = (innerSize - GAP * 2) / 3;
    return { cell: c, inner: innerSize };
  }, [size]);

  return (
    <View
      className="border"
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size * 0.22),
        padding: OUTER,
        backgroundColor: "#0a0a0c",
        borderColor: "rgba(255,255,255,0.2)",
        borderWidth: 1,
      }}
    >
      <View style={{ width: inner, height: inner, gap: GAP, flexDirection: "column" }}>
        {GRID.map((row, ri) => (
          <View key={ri} style={{ width: inner, height: cell, gap: GAP, flexDirection: "row" } as ViewStyle}>
            {row.map((bg, ci) => (
              <View
                key={ci}
                style={[
                  { width: cell, height: cell, backgroundColor: bg, borderRadius: 2.5 } as ViewStyle,
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
