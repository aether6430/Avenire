import type { MutableRefObject } from "react";

const TYPING_IMPULSE_ADD = 0.14;
const TYPING_IMPULSE_CAP = 1.35;
const SUBMIT_IMPULSE_PRIMARY = 0.52;
const SUBMIT_IMPULSE_SECOND_MS = 120;
const SUBMIT_IMPULSE_SECONDARY = 0.2;

export function pulseParticleTypingImpulse(
  impulseRef: MutableRefObject<number>,
  amount = TYPING_IMPULSE_ADD
) {
  impulseRef.current = Math.min(
    impulseRef.current + amount,
    TYPING_IMPULSE_CAP
  );
}

export function pulseParticleSubmitImpulse(
  impulseRef: MutableRefObject<number>
) {
  pulseParticleTypingImpulse(impulseRef, SUBMIT_IMPULSE_PRIMARY);
  window.setTimeout(() => {
    pulseParticleTypingImpulse(impulseRef, SUBMIT_IMPULSE_SECONDARY);
  }, SUBMIT_IMPULSE_SECOND_MS);
}

export function bumpParticleTypingImpulse(
  impulseRef: MutableRefObject<number>,
  event: Pick<
    KeyboardEvent,
    "altKey" | "ctrlKey" | "key" | "metaKey" | "repeat"
  >
) {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const isPrintable = event.key.length === 1;
  const isTextEditKey =
    isPrintable ||
    event.key === "Backspace" ||
    event.key === "Delete" ||
    event.key === "Enter" ||
    event.key === " ";

  if (!isTextEditKey) {
    return;
  }

  pulseParticleTypingImpulse(impulseRef, TYPING_IMPULSE_ADD);
}
