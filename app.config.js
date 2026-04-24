/* eslint-disable @typescript-eslint/no-require-imports */
// Optional OpenAI image generation (quest portraits): set in .env for dev builds, e.g.
// EXPO_PUBLIC_OPENAI_IMAGE_MODEL=gpt-image-2  (fallbacks gpt-image-1*, dall-e-3 are in code)
// EXPO_PUBLIC_OPENAI_IMAGE_SIZE=1024x1024
const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env.local") });
} catch {
  /* optional */
}
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  /* optional */
}

const appJson = require("./app.json");

module.exports = () => ({
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      openaiApiKey:
        process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        "",
    },
  },
});
