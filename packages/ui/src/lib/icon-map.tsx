"use client";

// ── Phosphor ────────────────────────────────────────────────
import {
  ArrowRight as PhArrowRight,
  Bell as PhBell,
  Books as PhBooks,
  Brain as PhBrain,
  CaretRight as PhCaretRight,
  Check as PhCheck,
  Circle as PhCircle,
  Clock as PhClock,
  Copy as PhCopy,
  DotOutline as PhDotOutline,
  Envelope as PhEnvelope,
  Gear as PhGear,
  Globe as PhGlobe,
  Heart as PhHeart,
  Image as PhImage,
  Lightbulb as PhLightbulb,
  Link as PhLink,
  List as PhList,
  Lock as PhLock,
  MagnifyingGlass as PhMagnifyingGlass,
  Monitor as PhMonitor,
  Moon as PhMoon,
  PaintBrush as PhPaintBrush,
  Palette as PhPalette,
  Plus as PhPlus,
  Rectangle as PhRectangle,
  Rocket as PhRocket,
  ArrowCounterClockwise as PhRotateCcw,
  Shield as PhShield,
  Spinner as PhSpinner,
  Star as PhStar,
  Sun as PhSun,
  User as PhUser,
  Users as PhUsers,
  X as PhX,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";

// ── Types ───────────────────────────────────────────────────

export interface IconComponentProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export type IconComponent = ComponentType<IconComponentProps>;

export type IconLibrary = "phosphor";

export type IconName =
  | "chevron-right"
  | "x"
  | "copy"
  | "menu"
  | "dot"
  | "monitor"
  | "sun"
  | "moon"
  | "rectangle-horizontal"
  | "circle"
  | "square-library"
  | "clock"
  | "star"
  | "settings"
  | "plus"
  | "arrow-right"
  | "search"
  | "loader"
  | "users"
  | "lock"
  | "mail"
  | "bell"
  | "shield"
  | "palette"
  | "lightbulb"
  | "rocket"
  | "heart"
  | "paintbrush"
  | "brain"
  | "globe"
  | "user"
  | "image"
  | "link"
  | "check"
  | "rotate-ccw";

export const iconLibraryOrder: IconLibrary[] = ["phosphor"];

export const iconLibraryLabels: Record<IconLibrary, string> = {
  phosphor: "Phosphor",
};

// ── Adapter Factories ───────────────────────────────────────

// Phosphor: uses filled paths per weight variant, not CSS stroke.
// Map numeric strokeWidth → discrete weight prop.
type PhosphorWeight = "thin" | "light" | "regular" | "bold";
function phosphor(
  Icon: ComponentType<{
    size?: number;
    weight?: PhosphorWeight;
    className?: string;
  }>
): IconComponent {
  return function PhosphorAdapter({
    size,
    strokeWidth,
    className,
  }: IconComponentProps) {
    const weight: PhosphorWeight =
      strokeWidth != null && strokeWidth >= 1.75 ? "regular" : "light";
    return <Icon className={className} size={size} weight={weight} />;
  };
}

// ── Icon Maps ───────────────────────────────────────────────

const phosphorMap: Record<IconName, IconComponent> = {
  "chevron-right": phosphor(PhCaretRight),
  x: phosphor(PhX),
  copy: phosphor(PhCopy),
  menu: phosphor(PhList),
  dot: phosphor(PhDotOutline),
  monitor: phosphor(PhMonitor),
  sun: phosphor(PhSun),
  moon: phosphor(PhMoon),
  "rectangle-horizontal": phosphor(PhRectangle),
  circle: phosphor(PhCircle),
  "square-library": phosphor(PhBooks),
  clock: phosphor(PhClock),
  star: phosphor(PhStar),
  settings: phosphor(PhGear),
  plus: phosphor(PhPlus),
  "arrow-right": phosphor(PhArrowRight),
  search: phosphor(PhMagnifyingGlass),
  loader: phosphor(PhSpinner),
  users: phosphor(PhUsers),
  lock: phosphor(PhLock),
  mail: phosphor(PhEnvelope),
  bell: phosphor(PhBell),
  shield: phosphor(PhShield),
  palette: phosphor(PhPalette),
  lightbulb: phosphor(PhLightbulb),
  rocket: phosphor(PhRocket),
  heart: phosphor(PhHeart),
  paintbrush: phosphor(PhPaintBrush),
  brain: phosphor(PhBrain),
  globe: phosphor(PhGlobe),
  user: phosphor(PhUser),
  image: phosphor(PhImage),
  link: phosphor(PhLink),
  check: phosphor(PhCheck),
  "rotate-ccw": phosphor(PhRotateCcw),
};

// ── Unified Map ─────────────────────────────────────────────

export const iconMap: Record<IconLibrary, Record<IconName, IconComponent>> = {
  phosphor: phosphorMap,
};
