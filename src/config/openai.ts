import Constants from "expo-constants";

/** Resolves the OpenAI key from Expo public env or `expo.extra` (see app.config.js + .env.local). */
export function getOpenAiApiKey(): string {
  const fromPublic = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();
  if (fromPublic) {
    return fromPublic;
  }
  const fromExtra = (Constants.expoConfig?.extra as { openaiApiKey?: string } | undefined)?.openaiApiKey?.trim();
  if (fromExtra) {
    return fromExtra;
  }
  return "";
}
