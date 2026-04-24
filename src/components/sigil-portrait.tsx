import React, { useMemo } from "react";
import { Image, Text, View } from "react-native";

import { colors } from "../theme";

type TProps = {
  personId: string;
  accent: string;
  size?: number;
  accessibilityLabel?: string;
  /** Local `file://`, remote `https://`, or `data:` URI from image generation. */
  portraitUri?: string;
  shape?: "circle" | "rounded-square";
};

function StylizedGridBackground({ size, accent, radius }: { size: number; accent: string; radius: number }) {
  const spacing = Math.max(8, Math.round(size / 6));
  const inset = Math.max(6, Math.round(size * 0.08));

  const positions = useMemo(() => {
    const count = Math.floor((size + inset * 2) / spacing);
    return Array.from({ length: Math.max(6, count) }, (_unused, index) => -inset + index * spacing);
  }, [inset, size, spacing]);

  return (
    <View pointerEvents="none" className="absolute -inset-2 overflow-hidden" style={{ borderRadius: radius }}>
      {/* faint tint */}
      <View className="absolute inset-0" style={{ backgroundColor: `${accent}12` }} />

      {/* grid lines */}
      {positions.map((pos) => (
        <View
          key={`v-${pos}`}
          className="absolute top-0"
          style={{
            left: pos,
            width: 1,
            height: size + inset * 2,
            backgroundColor: `${accent}26`,
          }}
        />
      ))}
      {positions.map((pos) => (
        <View
          key={`h-${pos}`}
          className="absolute left-0"
          style={{
            top: pos,
            height: 1,
            width: size + inset * 2,
            backgroundColor: `${accent}1f`,
          }}
        />
      ))}

      {/* subtle diagonal accent */}
      <View
        className="absolute"
        style={{
          left: -inset,
          top: size * 0.1,
          width: size + inset * 2,
          height: 1,
          backgroundColor: `${accent}33`,
          transform: [{ rotate: "-18deg" }],
          opacity: 0.35,
        }}
      />
    </View>
  );
}

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

export function SigilPortrait({
  personId,
  accent,
  size = 64,
  accessibilityLabel,
  portraitUri,
  shape = "circle",
}: TProps) {
  const hash = useMemo(() => hashPersonId(personId), [personId]);
  const initials = useMemo(() => initialsFromId(personId), [personId]);
  const glyphSize = Math.max(16, size * 0.34);
  const radius = shape === "circle" ? size / 2 : Math.max(10, Math.round(size * 0.22));

  const shellStyle: { width: number; height: number; borderRadius: number; borderColor: string } = {
    width: size,
    height: size,
    borderRadius: radius,
    borderColor: accent,
  };

  if (portraitUri) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        className="relative items-center justify-center overflow-hidden border-2"
        style={shellStyle}
      >
        <Image
          source={{ uri: portraitUri }}
          className="absolute left-0 top-0"
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      className="relative items-center justify-center overflow-hidden border-2"
      style={shellStyle}
    >
      <Text
        className="font-black tracking-[1px]"
        style={{
          color: colors.parchment,
          fontSize: glyphSize,
          textShadowColor: "rgba(0,0,0,0.45)",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 6,
        }}
      >
        {initials || "?"}
      </Text>
    </View>
  );
}
