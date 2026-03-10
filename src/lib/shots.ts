import type { UiRatio } from "./evolink";
import { NEGATIVE_BLOCK, buildRatioConsistencyBlock } from "./prompts";

export type FrameStyle = "black" | "white" | "gold" | "wood" | "frameless";

export const SHOT_LABELS: Record<number, string> = {
  0: "Base Artwork",
  1: "Hero Lifestyle",
  2: "Clean Artwork View",
  3: "Bedroom Scene",
  4: "Texture Macro",
  5: "Frame Presentation",
};

export function buildBaseArtworkPrompt(userPrompt: string): string {
  return `
\${userPrompt},
hand painted abstract impasto oil painting,
thick palette knife strokes, heavy textured oil paint,
linen canvas texture, oil gloss reflections,
modern gallery abstract composition,
no room, no wall, no frame, artwork only
NEGATIVE: \${NEGATIVE_BLOCK}
`.trim();
}

export function buildHeroLifestylePrompt(
  userPrompt: string,
  ratio: UiRatio
): string {
  const ratioBlock = buildRatioConsistencyBlock(ratio);
  return `
\${userPrompt},
same painting, identical artwork, do not change artwork content,
modern minimalist living room, linen sofa,
painting centered above sofa,
artwork occupies 45-60% of frame,
eye-level camera, 35mm interior photo lens look,
neutral beige wall, warm gray palette,
natural side daylight + subtle gallery spotlight,
realistic interior photography,
\${ratioBlock}
NEGATIVE: \${NEGATIVE_BLOCK}
`.trim();
}

export function buildCleanArtworkViewPrompt(
  userPrompt: string,
  ratio: UiRatio
): string {
  const ratioBlock = buildRatioConsistencyBlock(ratio);
  return `
\${userPrompt},
same painting, identical artwork, do not change artwork content,
painting centered on neutral wall,
gallery spotlight, soft shadows,
clean product presentation,
realistic photography, high-end gallery wall,
\${ratioBlock}
NEGATIVE: \${NEGATIVE_BLOCK}
`.trim();
}

export function buildBedroomScenePrompt(
  userPrompt: string,
  ratio: UiRatio
): string {
  const ratioBlock = buildRatioConsistencyBlock(ratio);
  return `
\${userPrompt},
same painting, identical artwork, do not change artwork content,
luxury minimal bedroom interior,
painting above bed, calm neutral palette,
soft daylight, realistic interior photography,
\${ratioBlock}
NEGATIVE: \${NEGATIVE_BLOCK}
`.trim();
}

export function buildTextureMacroPrompt(): string {
  return `
macro close-up of the same painting surface,
thick impasto ridges, palette knife marks,
visible brush strokes, oil paint texture on linen canvas,
shallow depth of field, realistic macro photography
NEGATIVE: \${NEGATIVE_BLOCK}
`.trim();
}

export function buildFramePresentationPrompt(
  userPrompt: string,
  ratio: UiRatio
): string {
  const ratioBlock = buildRatioConsistencyBlock(ratio);
  return `
\${userPrompt},
same painting, identical artwork, do not change artwork content,
premium framing presentation, elegant frame,
gallery lighting, museum-quality display,
realistic interior photography,
\${ratioBlock}
NEGATIVE: \${NEGATIVE_BLOCK}
`.trim();
}
