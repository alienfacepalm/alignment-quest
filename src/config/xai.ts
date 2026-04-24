import Constants from "expo-constants";

/** Resolves the xAI key from Expo public env or `expo.extra` (see app.config.js + .env.local). */
export function getXaiApiKey(): string {
  const fromPublic = process.env.EXPO_PUBLIC_XAI_API_KEY?.trim();
  if (fromPublic) {
    return fromPublic;
  }
  const fromExtra = (Constants.expoConfig?.extra as { xaiApiKey?: string } | undefined)?.xaiApiKey?.trim();
  if (fromExtra) {
    return fromExtra;
  }
  return "";
}

