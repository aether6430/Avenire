export function resolveParticleFieldFillColor(input: {
  adaptToTheme: boolean;
  color: string;
  isDark: boolean;
}) {
  return input.adaptToTheme
    ? input.isDark
      ? "rgba(255, 255, 255, 0.92)"
      : "rgba(10, 12, 16, 1)"
    : input.color;
}

export function resolveParticleFieldDrawBox(input: {
  align: "center" | "bottom";
  height: number;
  imageHeight: number;
  imageWidth: number;
  renderScale: number;
  width: number;
}) {
  const srcRatio = input.imageWidth / input.imageHeight;
  const dstRatio = input.width / input.height;
  let drawWidth = input.width;
  let drawHeight = input.height;

  if (srcRatio > dstRatio) {
    drawHeight = input.height;
    drawWidth = input.height * srcRatio;
  } else {
    drawWidth = input.width;
    drawHeight = input.width / srcRatio;
  }

  drawWidth *= input.renderScale;
  drawHeight *= input.renderScale;

  return {
    clusterHeight: drawHeight,
    clusterWidth: drawWidth,
    drawHeight,
    drawWidth,
    offsetX: (input.width - drawWidth) / 2,
    offsetY:
      input.align === "bottom"
        ? input.height - drawHeight - Math.min(40, input.height * 0.04)
        : (input.height - drawHeight) / 2,
  };
}

export function shouldKeepParticleTarget(input: {
  denseParticles: boolean;
  luminance: number;
  randomValue: number;
}) {
  if (input.denseParticles) {
    return true;
  }

  if (input.luminance > 0.8) {
    return true;
  }
  if (input.luminance > 0.5) {
    return input.randomValue < 0.85;
  }
  if (input.luminance > 0.25) {
    return input.randomValue < 0.55;
  }
  return input.randomValue < 0.28;
}

export function randomParticleSpringJitter(randomValue = Math.random()) {
  return 0.9 + randomValue * 0.2;
}

export function shuffleParticleIndices(
  length: number,
  random: () => number = Math.random
) {
  const values = new Array<number>(length);
  for (let index = 0; index < length; index++) {
    values[index] = index;
  }
  for (let index = length - 1; index > 0; index--) {
    const swapIndex = (random() * (index + 1)) | 0;
    const value = values[index];
    values[index] = values[swapIndex]!;
    values[swapIndex] = value!;
  }
  return values;
}
