"use client";

import {
  type MutableRefObject,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  randomParticleSpringJitter,
  resolveParticleFieldDrawBox,
  resolveParticleFieldFillColor,
  shouldKeepParticleTarget,
  shuffleParticleIndices,
} from "@/components/ui/particle-field-model";

interface Particle {
  alpha: number;
  appear: number;
  fading: boolean;
  ox: number;
  oy: number;
  phase: number;
  size: number;
  springJitter: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
}

interface ParticleTarget {
  alpha: number;
  ox: number;
  oy: number;
  size: number;
}

export interface ParticleFieldProps {
  adaptToTheme?: boolean;
  align?: "center" | "bottom";
  className?: string;
  color?: string;
  damping?: number;
  denseParticles?: boolean;
  dotSize?: number;
  invert?: boolean;
  mouseForce?: number;
  mouseRadius?: number;
  renderScale?: number;
  sampleStep?: number;
  spring?: number;
  src: string | { src: string };
  threshold?: number;
  typingImpulseRef?: MutableRefObject<number>;
}

function subscribeDocumentDark(callback: () => void) {
  const el = document.documentElement;
  const observer = new MutationObserver(callback);
  observer.observe(el, { attributes: true, attributeFilter: ["class"] });
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener("change", callback);
  };
}

function getDocumentDarkSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerDarkSnapshot() {
  return true;
}

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

function useDocumentDark() {
  return useSyncExternalStore(
    subscribeDocumentDark,
    getDocumentDarkSnapshot,
    getServerDarkSnapshot
  );
}

export function ParticleField({
  src,
  sampleStep = 3,
  threshold = 50,
  renderScale = 1,
  dotSize = 1.15,
  mouseForce = 90,
  mouseRadius = 110,
  spring = 0.035,
  damping = 0.86,
  className,
  align = "center",
  color = "rgba(255, 255, 255, 0.92)",
  invert = false,
  adaptToTheme = true,
  typingImpulseRef,
  denseParticles = false,
}: ParticleFieldProps) {
  const normalizedSrc = typeof src === "string" ? src : src.src;
  const isDark = useDocumentDark();
  const fillColorRef = useRef(color);
  fillColorRef.current = resolveParticleFieldFillColor({
    adaptToTheme,
    color,
    isDark,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ active: false, x: -9999, y: -9999 });
  const srcRef = useRef(normalizedSrc);
  srcRef.current = normalizedSrc;
  const applySrcRef = useRef<((nextSrc: string) => void) | null>(null);

  const sampleStepRef = useRef(sampleStep);
  sampleStepRef.current = sampleStep;
  const thresholdRef = useRef(threshold);
  thresholdRef.current = threshold;
  const renderScaleRef = useRef(renderScale);
  renderScaleRef.current = renderScale;
  const dotSizeRef = useRef(dotSize);
  dotSizeRef.current = dotSize;
  const mouseForceRef = useRef(mouseForce);
  mouseForceRef.current = mouseForce;
  const mouseRadiusRef = useRef(mouseRadius);
  mouseRadiusRef.current = mouseRadius;
  const springRef = useRef(spring);
  springRef.current = spring;
  const dampingRef = useRef(damping);
  dampingRef.current = damping;
  const alignRef = useRef(align);
  alignRef.current = align;
  const invertRef = useRef(invert);
  invertRef.current = invert;
  const denseParticlesRef = useRef(denseParticles);
  denseParticlesRef.current = denseParticles;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!(canvas && wrapper)) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    let particles: Particle[] = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let clusterWidth = 0;
    let clusterHeight = 0;
    let offsetX = 0;
    let offsetY = 0;
    let rafId = 0;
    let time = 0;
    let destroyed = false;
    let resizeRaf = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let currentImage: HTMLImageElement | null = null;
    let loadToken = 0;

    const ensureCanvasSize = () => {
      const rect = wrapper.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const sampleTargets = (image: HTMLImageElement): ParticleTarget[] => {
      if (!(image.width && image.height)) {
        return [];
      }

      const drawBox = resolveParticleFieldDrawBox({
        align: alignRef.current,
        height,
        imageHeight: image.height,
        imageWidth: image.width,
        renderScale: renderScaleRef.current,
        width,
      });
      const { drawHeight, drawWidth } = drawBox;

      const sampleWidth = Math.max(
        80,
        Math.floor(drawWidth / sampleStepRef.current)
      );
      const sampleHeight = Math.max(
        80,
        Math.floor(drawHeight / sampleStepRef.current)
      );

      const offscreen = document.createElement("canvas");
      offscreen.width = sampleWidth;
      offscreen.height = sampleHeight;
      const offscreenContext = offscreen.getContext("2d", {
        willReadFrequently: true,
      });
      if (!offscreenContext) {
        return [];
      }

      offscreenContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const data = offscreenContext.getImageData(
        0,
        0,
        sampleWidth,
        sampleHeight
      ).data;
      const cellWidth = drawWidth / sampleWidth;
      const cellHeight = drawHeight / sampleHeight;
      clusterWidth = drawBox.clusterWidth;
      clusterHeight = drawBox.clusterHeight;
      offsetX = drawBox.offsetX;
      offsetY = drawBox.offsetY;

      const targets: ParticleTarget[] = [];

      for (let y = 0; y < sampleHeight; y++) {
        for (let x = 0; x < sampleWidth; x++) {
          const index = (y * sampleWidth + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];
          const rawBrightness = (r + g + b) / 3;
          const brightness = invertRef.current
            ? 255 - rawBrightness
            : rawBrightness;

          if (a < 200 || brightness < thresholdRef.current) {
            continue;
          }

          const luminance = brightness / 255;
          if (
            !shouldKeepParticleTarget({
              denseParticles: denseParticlesRef.current,
              luminance,
              randomValue: Math.random(),
            })
          ) {
            continue;
          }

          const px = (offsetX + x * cellWidth + cellWidth / 2) * dpr;
          const py = (offsetY + y * cellHeight + cellHeight / 2) * dpr;
          targets.push({
            alpha: 0.35 + luminance * 0.6,
            ox: px,
            oy: py,
            size: (dotSizeRef.current + luminance * 0.9) * dpr,
          });
        }
      }

      return targets;
    };

    const buildFresh = (image: HTMLImageElement) => {
      if (!(image.width && image.height)) {
        return;
      }

      ensureCanvasSize();
      const targets = sampleTargets(image);
      particles = targets.map((target) => ({
        alpha: target.alpha,
        appear: 1,
        fading: false,
        ox: target.ox,
        oy: target.oy,
        phase: Math.random() * Math.PI * 2,
        size: target.size,
        springJitter: randomParticleSpringJitter(),
        vx: 0,
        vy: 0,
        x: target.ox + (Math.random() - 0.5) * 40,
        y: target.oy + (Math.random() - 0.5) * 40,
      }));
    };

    const morphTo = (image: HTMLImageElement) => {
      if (!(image.width && image.height)) {
        return;
      }

      if (particles.length === 0) {
        buildFresh(image);
        return;
      }

      ensureCanvasSize();
      const targets = sampleTargets(image);
      const particleCount = particles.length;
      const targetCount = targets.length;
      const matched = Math.min(particleCount, targetCount);
      const particleOrder = shuffleParticleIndices(particleCount);
      const targetOrder = shuffleParticleIndices(targetCount);

      for (let index = 0; index < matched; index++) {
        const particle = particles[particleOrder[index]!]!;
        const target = targets[targetOrder[index]!]!;
        particle.ox = target.ox;
        particle.oy = target.oy;
        particle.size = target.size;
        particle.alpha = target.alpha;
        particle.fading = false;
        particle.springJitter = randomParticleSpringJitter();
      }

      for (let index = matched; index < particleCount; index++) {
        particles[particleOrder[index]!]!.fading = true;
      }

      for (let index = matched; index < targetCount; index++) {
        const target = targets[targetOrder[index]!]!;
        const angle = Math.random() * Math.PI * 2;
        const distance = (20 + Math.random() * 40) * dpr;
        particles.push({
          alpha: target.alpha,
          appear: 0,
          fading: false,
          ox: target.ox,
          oy: target.oy,
          phase: Math.random() * Math.PI * 2,
          size: target.size,
          springJitter: randomParticleSpringJitter(),
          vx: 0,
          vy: 0,
          x: target.ox + Math.cos(angle) * distance,
          y: target.oy + Math.sin(angle) * distance,
        });
      }
    };

    const render = () => {
      if (destroyed) {
        return;
      }

      time += 0.016;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = fillColorRef.current;

      const pointerX = pointerRef.current.x * dpr;
      const pointerY = pointerRef.current.y * dpr;
      const mouseRadiusScaled = mouseRadiusRef.current * dpr;
      const mouseRadiusSquared = mouseRadiusScaled * mouseRadiusScaled;

      let typing = typingImpulseRef?.current ?? 0;
      if (typingImpulseRef && typing > 1e-4) {
        typingImpulseRef.current *= 0.9;
        if (typingImpulseRef.current < 0.02) {
          typingImpulseRef.current = 0;
        }
      }

      typing = typingImpulseRef?.current ?? 0;
      const typingBoost = 1 + typing * 10;
      const rippleCenterX = (offsetX + clusterWidth * 0.5) * dpr;
      const rippleCenterY = (offsetY + clusterHeight * 0.48) * dpr;

      let writeIndex = 0;
      for (let index = 0; index < particles.length; index++) {
        const particle = particles[index]!;
        const offsetToOriginX = particle.ox - particle.x;
        const offsetToOriginY = particle.oy - particle.y;
        const springStrength = springRef.current * particle.springJitter;
        particle.vx += offsetToOriginX * springStrength;
        particle.vy += offsetToOriginY * springStrength;

        if (pointerRef.current.active) {
          const dx = particle.x - pointerX;
          const dy = particle.y - pointerY;
          const distanceSquared = dx * dx + dy * dy;
          if (
            distanceSquared < mouseRadiusSquared &&
            distanceSquared > 0.0001
          ) {
            const distance = Math.sqrt(distanceSquared);
            const force =
              (1 - distance / mouseRadiusScaled) * mouseForceRef.current;
            particle.vx += (dx / distance) * force * 0.04;
            particle.vy += (dy / distance) * force * 0.04;
          }
        }

        const drift = Math.sin(time * 0.8 + particle.phase) * 0.08;
        particle.vx += drift * 0.05 * typingBoost;
        particle.vy +=
          Math.cos(time * 0.9 + particle.phase) * 0.04 * typingBoost;

        if (typing > 1e-4) {
          particle.vx += (Math.random() - 0.5) * typing * 2.8;
          particle.vy += (Math.random() - 0.5) * typing * 2.8;
          const rippleDx = particle.x - rippleCenterX;
          const rippleDy = particle.y - rippleCenterY;
          const rippleDistance =
            Math.sqrt(rippleDx * rippleDx + rippleDy * rippleDy) + 0.5;
          const ripple = (typing * 22 * dpr) / rippleDistance;
          particle.vx += (rippleDx / rippleDistance) * ripple * 0.018;
          particle.vy += (rippleDy / rippleDistance) * ripple * 0.018;
        }

        particle.vx *= dampingRef.current;
        particle.vy *= dampingRef.current;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const appearTarget = particle.fading ? 0 : 1;
        particle.appear += (appearTarget - particle.appear) * 0.08;
        if (particle.fading && particle.appear < 0.02) {
          continue;
        }

        const twinkle =
          0.85 +
          Math.sin(time * (1.4 + typing * 2.2) + particle.phase) *
            (0.15 + typing * 0.35);

        context.globalAlpha = particle.alpha * particle.appear * twinkle;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();

        if (writeIndex !== index) {
          particles[writeIndex] = particle;
        }
        writeIndex++;
      }

      if (writeIndex !== particles.length) {
        particles.length = writeIndex;
      }
      context.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = wrapper.getBoundingClientRect();
      pointerRef.current.x = event.clientX - rect.left;
      pointerRef.current.y = event.clientY - rect.top;
      pointerRef.current.active = true;
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
      pointerRef.current.x = -9999;
      pointerRef.current.y = -9999;
    };

    const resizeObserver = new ResizeObserver(() => {
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
      }
      resizeRaf = requestAnimationFrame(() => {
        if (resizeTimer) {
          clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(() => {
          if (currentImage) {
            buildFresh(currentImage);
          }
        }, 120);
      });
    });

    const loadAndApply = (nextSrc: string, asMorph: boolean) => {
      const token = ++loadToken;
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      image.onload = () => {
        if (destroyed || token !== loadToken) {
          return;
        }
        currentImage = image;
        if (asMorph) {
          morphTo(image);
        } else {
          buildFresh(image);
        }
      };
      image.src = nextSrc;
    };

    applySrcRef.current = (nextSrc: string) => loadAndApply(nextSrc, true);
    resizeObserver.observe(wrapper);
    rafId = requestAnimationFrame(render);
    loadAndApply(srcRef.current, false);
    wrapper.addEventListener("pointermove", onPointerMove);
    wrapper.addEventListener("pointerleave", onPointerLeave);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      if (resizeRaf) {
        cancelAnimationFrame(resizeRaf);
      }
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeObserver.disconnect();
      wrapper.removeEventListener("pointermove", onPointerMove);
      wrapper.removeEventListener("pointerleave", onPointerLeave);
      applySrcRef.current = null;
    };
  }, [typingImpulseRef]);

  const lastAppliedSrcRef = useRef(normalizedSrc);

  useEffect(() => {
    if (lastAppliedSrcRef.current === normalizedSrc) {
      return;
    }
    lastAppliedSrcRef.current = normalizedSrc;
    applySrcRef.current?.(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <div
      className={className}
      ref={wrapperRef}
      style={{ height: "100%", position: "relative", width: "100%" }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", height: "100%", width: "100%" }}
      />
    </div>
  );
}
