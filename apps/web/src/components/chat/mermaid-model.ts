export interface MermaidViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 5;
export const FIT_MARGIN_PX = 24;

export function fixMermaidQuotes(code: string) {
  return code.replace(/(\w+)\[([^"\]]+)\]/g, '$1["$2"]');
}

export function stripUnsafeSvg(svg: string) {
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s(?:href|xlink:href)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
      ""
    );
}

export function clampMermaidScale(scale: number) {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

export function buildZoomedMermaidViewState(input: {
  nextScale: number;
  pointX: number;
  pointY: number;
  viewState: MermaidViewState;
}) {
  const clamped = clampMermaidScale(input.nextScale);
  const sourcePointX =
    (input.pointX - input.viewState.translateX) / input.viewState.scale;
  const sourcePointY =
    (input.pointY - input.viewState.translateY) / input.viewState.scale;

  return {
    scale: clamped,
    translateX: input.pointX - sourcePointX * clamped,
    translateY: input.pointY - sourcePointY * clamped,
  };
}

export function buildFitToScreenMermaidViewState(input: {
  containerHeight: number;
  containerWidth: number;
  naturalHeight: number;
  naturalWidth: number;
}): MermaidViewState | null {
  if (!(input.naturalHeight && input.naturalWidth)) {
    return null;
  }

  const availableWidth = Math.max(1, input.containerWidth - FIT_MARGIN_PX * 2);
  const availableHeight = Math.max(
    1,
    input.containerHeight - FIT_MARGIN_PX * 2
  );
  const scaleX = availableWidth / input.naturalWidth;
  const scaleY = availableHeight / input.naturalHeight;
  const scale = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), 1);

  return {
    scale,
    translateX: (input.containerWidth - input.naturalWidth * scale) / 2,
    translateY: (input.containerHeight - input.naturalHeight * scale) / 2,
  };
}
