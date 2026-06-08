#!/usr/bin/env node

const { assertOnboardingVisualQualityImage } = require("./smoke-visual-utils");

function createImage(width = 1000, height = 640) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 246;
    pixels[index + 1] = 238;
    pixels[index + 2] = 228;
    pixels[index + 3] = 255;
  }
  return { width, height, pixels };
}

function fillRect(image, x, y, width, height, color) {
  const [r, g, b, a = 255] = color;
  const left = Math.max(0, Math.floor(x));
  const right = Math.min(image.width, Math.ceil(x + width));
  const top = Math.max(0, Math.floor(y));
  const bottom = Math.min(image.height, Math.ceil(y + height));
  for (let py = top; py < bottom; py += 1) {
    for (let px = left; px < right; px += 1) {
      const index = ((py * image.width) + px) * 4;
      image.pixels[index] = r;
      image.pixels[index + 1] = g;
      image.pixels[index + 2] = b;
      image.pixels[index + 3] = a;
    }
  }
}

function drawSyntheticOnboarding(image, options = {}) {
  if (options.withPill !== false) {
    fillRect(image, 300, 42, 180, 38, [236, 255, 246]);
    for (let i = 0; i < 10; i += 1) {
      fillRect(image, 318 + (i * 14), 54, 7, 14, options.pillTextColor || [23, 56, 47]);
    }
  }

  if (options.withAction !== false) {
    fillRect(image, 215, 542, 220, 48, options.actionColor || [18, 31, 28]);
    for (let i = 0; i < 12; i += 1) {
      fillRect(image, 238 + (i * 13), 555, 6, 20, options.actionTextColor || [240, 245, 241]);
    }
  }
}

function assertThrows(label, fn, pattern) {
  try {
    fn();
  } catch (error) {
    if (!pattern.test(error.message)) {
      throw new Error(`${label}: unexpected error "${error.message}"`);
    }
    return;
  }
  throw new Error(`${label}: expected failure`);
}

function main() {
  const good = createImage();
  drawSyntheticOnboarding(good);
  const diagnostics = assertOnboardingVisualQualityImage(good);

  if (!/contrast=/.test(diagnostics.pill) || !/contrast=/.test(diagnostics.action)) {
    throw new Error(`visual diagnostics are incomplete: ${JSON.stringify(diagnostics)}`);
  }

  const missingPill = createImage();
  drawSyntheticOnboarding(missingPill, { withPill: false });
  assertThrows("missing status pill", () => {
    assertOnboardingVisualQualityImage(missingPill);
  }, /status pill was not detected/);

  const lowContrastPill = createImage();
  drawSyntheticOnboarding(lowContrastPill, { pillTextColor: [210, 238, 226] });
  assertThrows("low-contrast status pill", () => {
    assertOnboardingVisualQualityImage(lowContrastPill);
  }, /status pill text contrast is too low/);

  const missingAction = createImage();
  drawSyntheticOnboarding(missingAction, { withAction: false });
  assertThrows("missing primary action", () => {
    assertOnboardingVisualQualityImage(missingAction);
  }, /primary action button was not detected/);

  const lowContrastAction = createImage();
  drawSyntheticOnboarding(lowContrastAction, { actionTextColor: [58, 72, 68] });
  assertThrows("low-contrast primary action", () => {
    assertOnboardingVisualQualityImage(lowContrastAction);
  }, /primary action text is not readable enough/);

  console.log("[smoke:visual] PASSED. Onboarding visual helper detects readable, missing, and low-contrast states.");
  console.log(`  - pill: ${diagnostics.pill}`);
  console.log(`  - action: ${diagnostics.action}`);
}

try {
  main();
} catch (error) {
  console.error("[smoke:visual] FAILED.", error.message);
  process.exitCode = 1;
}
