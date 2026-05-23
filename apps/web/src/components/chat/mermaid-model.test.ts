import { describe, expect, it } from "vitest";
import {
  buildFitToScreenMermaidViewState,
  buildZoomedMermaidViewState,
  clampMermaidScale,
  fixMermaidQuotes,
  resolveMermaidExportBackground,
  stripUnsafeSvg,
} from "@/components/chat/mermaid-model";

describe("mermaid model", () => {
  it("normalizes node labels and strips unsafe SVG content", () => {
    expect(fixMermaidQuotes('graph TD;A[Hello world]-->B["Quoted"]')).toBe(
      'graph TD;A["Hello world"]-->B["Quoted"]'
    );

    expect(
      stripUnsafeSvg(
        '<svg><script>alert(1)</script><foreignObject>bad</foreignObject><a href="javascript:alert(1)" onclick="hack()">x</a></svg>'
      )
    ).toBe("<svg><a>x</a></svg>");
  });

  it("clamps and zooms the mermaid view state around a point", () => {
    expect(clampMermaidScale(0.1)).toBe(0.25);
    expect(clampMermaidScale(7)).toBe(5);

    expect(
      buildZoomedMermaidViewState({
        nextScale: 2,
        pointX: 200,
        pointY: 100,
        viewState: {
          scale: 1,
          translateX: 20,
          translateY: 10,
        },
      })
    ).toEqual({
      scale: 2,
      translateX: -160,
      translateY: -80,
    });
  });

  it("fits the diagram into the available container bounds", () => {
    expect(
      buildFitToScreenMermaidViewState({
        containerHeight: 500,
        containerWidth: 800,
        naturalHeight: 200,
        naturalWidth: 400,
      })
    ).toEqual({
      scale: 1,
      translateX: 200,
      translateY: 150,
    });

    expect(
      buildFitToScreenMermaidViewState({
        containerHeight: 200,
        containerWidth: 200,
        naturalHeight: 800,
        naturalWidth: 400,
      })
    ).toEqual({
      scale: 0.25,
      translateX: 50,
      translateY: 0,
    });
  });

  it("prefers theme-aware export backgrounds before falling back", () => {
    expect(
      resolveMermaidExportBackground({
        canvasBackground: "  #141414  ",
        background: "#fcfcfc",
      })
    ).toBe("#141414");
    expect(resolveMermaidExportBackground({ background: "  #fcfcfc  " })).toBe(
      "#fcfcfc"
    );
    expect(resolveMermaidExportBackground({})).toBe("#fcfcfc");
  });
});
