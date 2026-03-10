import type { UiRatio } from "./evolink";

export const NEGATIVE_BLOCK = `
print, poster, digital illustration, flat texture, smooth surface, vector,
cartoon, CGI render, watermark, text overlay
`.trim();

export function buildRatioConsistencyBlock(ratio: UiRatio | string) {
  return `
frame and canvas aspect ratio matches \${ratio},
stretched canvas proportions exactly \${ratio}
`.trim();
}
