import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { getPortraitLayout, type PersonPortraitProps } from "../lib/person-portrait-model";
import { colors } from "../theme";

/**
 * Deterministic on-device portrait (no network). Uses Views so it runs in **Expo Go**.
 * For GPU Skia rendering, use a dev build (`npx expo run:ios`) and a Skia-based variant;
 * Expo Go does not ship `RNSkiaModule`.
 */
export function PersonPortrait({ personId, accent, size = 64, accessibilityLabel }: PersonPortraitProps) {
  const L = useMemo(() => getPortraitLayout(personId, accent, size), [personId, accent, size]);
  const p = L.palette;

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
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            styles.blob,
            {
              width: L.blob1.w,
              height: L.blob1.h,
              borderRadius: size * 0.4,
              backgroundColor: p.blobA,
              opacity: L.blob1.opacity,
              left: L.blob1.x,
              top: L.blob1.y,
            },
          ]}
        />
        <View
          style={[
            styles.blob,
            {
              width: L.blob2.w,
              height: L.blob2.h,
              borderRadius: size * 0.35,
              backgroundColor: p.blobB,
              opacity: L.blob2.opacity,
              left: L.blob2.x,
              top: L.blob2.y,
            },
          ]}
        />
      </View>

      <View style={[styles.shirt, { top: L.shirtTop, height: L.shirtH, backgroundColor: p.shirt }]} />
      <View
        style={[
          styles.neck,
          {
            width: L.neckW,
            height: L.neckH,
            top: L.neckTop,
            left: L.neckLeft,
            backgroundColor: p.skinShadow,
          },
        ]}
      />

      <View
        style={[
          styles.hair,
          {
            left: L.hairLeft,
            top: L.hairTop,
            width: L.hairW,
            height: L.hairH,
            borderTopLeftRadius: L.hairH * 0.95,
            borderTopRightRadius: L.hairH * 0.95,
            borderBottomLeftRadius: L.hairW * 0.42,
            borderBottomRightRadius: L.hairW * 0.42,
            backgroundColor: p.hair,
          },
        ]}
      />

      <View
        style={[
          styles.face,
          {
            left: L.faceLeft,
            top: L.faceTop,
            width: L.faceW,
            height: L.faceH,
            borderRadius: L.faceW / 2,
            backgroundColor: p.skin,
          },
        ]}
      >
        <View
          style={[
            styles.eyeRow,
            {
              top: L.faceH * p.eyeFromTop,
              paddingHorizontal: L.faceW * (0.12 + p.eyeGap),
              gap: L.faceW * p.eyeGap,
            },
          ]}
        >
          <View style={[styles.sclera, { width: L.eye, height: L.eye, borderRadius: L.eye / 2 }]}>
            <View
              style={[
                styles.pupil,
                {
                  width: L.eye * 0.45,
                  height: L.eye * 0.45,
                  borderRadius: (L.eye * 0.45) / 2,
                  backgroundColor: p.pupil,
                  transform: [{ translateX: p.pupilShift }],
                },
              ]}
            />
          </View>
          <View style={[styles.sclera, { width: L.eye, height: L.eye, borderRadius: L.eye / 2 }]}>
            <View
              style={[
                styles.pupil,
                {
                  width: L.eye * 0.45,
                  height: L.eye * 0.45,
                  borderRadius: (L.eye * 0.45) / 2,
                  backgroundColor: p.pupil,
                  transform: [{ translateX: -p.pupilShift }],
                },
              ]}
            />
          </View>
        </View>
        <View
          style={[
            styles.mouth,
            {
              width: L.mouthW,
              height: L.mouthH,
              borderRadius: L.mouthH / 2,
              bottom: L.faceH * 0.16,
              left: (L.faceW - L.mouthW) / 2,
              backgroundColor: colors.ink,
              opacity: 0.75,
            },
          ]}
        />
      </View>
    </View>
  );
}

export type { PersonPortraitProps } from "../lib/person-portrait-model";

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: colors.ink,
    justifyContent: "flex-end",
  },
  blob: {
    position: "absolute",
  },
  shirt: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  neck: {
    position: "absolute",
  },
  face: {
    position: "absolute",
  },
  eyeRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  sclera: {
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  pupil: {},
  mouth: {
    position: "absolute",
  },
  hair: {
    position: "absolute",
  },
});
