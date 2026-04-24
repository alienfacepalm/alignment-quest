import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import { SigilPortrait } from "./sigil-portrait";
import type { TPersonCard } from "../game/types";
import { colors, shadow } from "../theme";

type TProps = {
  person: TPersonCard;
  cardW: number;
  marginLeft: number;
  zIndex: number;
  minHeight: number;
  sigilSize: number;
  tiltDeg: number;
  liftPx: number;
  active: boolean;
  bringToFront?: boolean;
  onTap: () => void;
  onFrontBegin?: () => void;
  onFrontEnd?: () => void;
  onDragBegin: () => void;
  onDragEnd: (absoluteX: number, absoluteY: number) => void;
};

export function DeckFanCard({
  person,
  cardW,
  marginLeft,
  zIndex,
  minHeight,
  sigilSize,
  tiltDeg,
  liftPx,
  active,
  bringToFront = false,
  onTap,
  onFrontBegin,
  onFrontEnd,
  onDragBegin,
  onDragEnd,
}: TProps) {
  const transX = useSharedValue(0);
  const transY = useSharedValue(0);
  const dragging = useSharedValue(0);

  const pan = Gesture.Pan()
    .minDistance(10)
    .onStart(() => {
      dragging.value = 1;
      runOnJS(onDragBegin)();
    })
    .onUpdate((e) => {
      transX.value = e.translationX;
      transY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
      transX.value = withSpring(0, { damping: 16, stiffness: 220 });
      transY.value = withSpring(0, { damping: 16, stiffness: 220 });
      dragging.value = withTiming(0, { duration: 160 });
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onTap)();
  });

  const gesture = Gesture.Exclusive(tap, pan);

  const dragStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: transX.value },
      { translateY: transY.value },
      { scale: active ? 1.05 + 0.02 * dragging.value : 1 + 0.03 * dragging.value },
    ],
  }));

  return (
    <View
      style={[
        styles.fanSlot,
        {
          width: cardW,
          marginLeft,
          zIndex: bringToFront ? zIndex + 1000 : zIndex,
          transform: [{ translateY: -liftPx }, { rotate: `${tiltDeg}deg` }],
        },
      ]}
      onTouchStart={() => onFrontBegin?.()}
      onTouchEnd={() => onFrontEnd?.()}
      onPointerEnter={Platform.OS === "web" ? () => onFrontBegin?.() : undefined}
      onPointerLeave={Platform.OS === "web" ? () => onFrontEnd?.() : undefined}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${person.name}. Tap to select, or drag onto the board.`}
          style={[
            styles.card,
            shadow.card,
            dragStyle,
            {
              width: cardW,
              minHeight,
              borderColor: active ? person.accent : colors.panelBorder,
            },
            active ? styles.cardActive : undefined,
          ]}
        >
          <Text style={styles.name} numberOfLines={2}>
            {person.name}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            {person.role}
          </Text>
          <View style={[styles.art, { backgroundColor: `${person.accent}22`, minHeight: sigilSize + 16 }]}>
            <SigilPortrait
              personId={person.id}
              accent={person.accent}
              size={sigilSize}
              accessibilityLabel={person.name}
              portraitUri={person.portraitUri}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fanSlot: {
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(13, 17, 29, 0.96)",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  cardActive: {
    backgroundColor: "rgba(28, 36, 62, 0.98)",
  },
  name: {
    color: colors.parchment,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  role: {
    color: colors.parchmentMuted,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  art: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
});
