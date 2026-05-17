import { describe, expect, it } from "vitest";
import {
  buildPanPinchZoomTransform,
  clampPanPinchTransform,
  isPanPinchDoubleTap,
} from "@/components/files/pan-pinch-image-model";

describe("pan-pinch image model", () => {
  it("clamps transform scale and offsets to container bounds", () => {
    expect(
      clampPanPinchTransform(
        { scale: 8, x: 720, y: -640 },
        { height: 200, width: 300 },
        { maxScale: 5, minScale: 1 }
      )
    ).toEqual({
      scale: 5,
      x: 600,
      y: -400,
    });
  });

  it("builds a focal-point zoom transform from the current state", () => {
    expect(
      buildPanPinchZoomTransform({
        bounds: { height: 200, width: 300 },
        currentTransform: { scale: 1.5, x: 20, y: -10 },
        focalPoint: { x: 220, y: 140 },
        maxScale: 5,
        minScale: 1,
        requestedScale: 3,
      })
    ).toEqual({
      scale: 3,
      x: -30,
      y: -60,
    });
  });

  it("matches only close double taps inside the time window", () => {
    expect(
      isPanPinchDoubleTap({
        distancePx: 18,
        elapsedMs: 240,
      })
    ).toBe(true);

    expect(
      isPanPinchDoubleTap({
        distancePx: 24,
        elapsedMs: 240,
      })
    ).toBe(false);

    expect(
      isPanPinchDoubleTap({
        distancePx: 18,
        elapsedMs: 320,
      })
    ).toBe(false);
  });
});
