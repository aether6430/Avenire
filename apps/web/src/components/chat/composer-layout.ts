export const TEXTAREA_MULTILINE_HEIGHT = 40;

export function shouldUseMultilineComposer(input: {
  measuredHeight: number;
  value: string;
}) {
  return (
    input.value.includes("\n") ||
    input.measuredHeight > TEXTAREA_MULTILINE_HEIGHT
  );
}
