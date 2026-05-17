import { describe, expect, it } from "vitest";
import {
  randomParticleSpringJitter,
  resolveParticleFieldDrawBox,
  resolveParticleFieldFillColor,
  shouldKeepParticleTarget,
  shuffleParticleIndices,
} from "@/components/ui/particle-field-model";

describe("particle field model", () => {
  it("resolves theme-aware fill colors", () => {
    expect(
      resolveParticleFieldFillColor({
        adaptToTheme: true,
        color: "rgba(1,2,3,1)",
        isDark: true,
      })
    ).toBe("rgba(255, 255, 255, 0.92)");
    expect(
      resolveParticleFieldFillColor({
        adaptToTheme: true,
        color: "rgba(1,2,3,1)",
        isDark: false,
      })
    ).toBe("rgba(10, 12, 16, 1)");
  });

  it("computes centered and bottom-aligned draw boxes", () => {
    expect(
      resolveParticleFieldDrawBox({
        align: "center",
        height: 400,
        imageHeight: 100,
        imageWidth: 200,
        renderScale: 1,
        width: 300,
      })
    ).toMatchObject({
      drawHeight: 400,
      drawWidth: 800,
      offsetX: -250,
      offsetY: 0,
    });

    expect(
      resolveParticleFieldDrawBox({
        align: "bottom",
        height: 400,
        imageHeight: 100,
        imageWidth: 200,
        renderScale: 1,
        width: 300,
      }).offsetY
    ).toBe(-16);
  });

  it("keeps or drops sparse particles from deterministic luminance bands", () => {
    expect(
      shouldKeepParticleTarget({
        denseParticles: false,
        luminance: 0.9,
        randomValue: 0.99,
      })
    ).toBe(true);
    expect(
      shouldKeepParticleTarget({
        denseParticles: false,
        luminance: 0.4,
        randomValue: 0.6,
      })
    ).toBe(false);
    expect(
      shouldKeepParticleTarget({
        denseParticles: true,
        luminance: 0.1,
        randomValue: 0.99,
      })
    ).toBe(true);
  });

  it("keeps helper randomness bounded and index shuffles complete", () => {
    expect(randomParticleSpringJitter(0)).toBe(0.9);
    expect(randomParticleSpringJitter(1)).toBe(1.1);
    expect(shuffleParticleIndices(4, () => 0)).toEqual([1, 2, 3, 0]);
  });
});
