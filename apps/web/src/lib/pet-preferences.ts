"use client";

export const PET_VISIBILITY_STORAGE_KEY = "avenire:pet:visible";
export const PET_POSITION_STORAGE_KEY = "avenire:pet:position";
export const PET_NOTIFICATION_EVENT = "avenire:pet-notification";

export type PetAccessory =
  | "none"
  | "flower"
  | "pencil"
  | "duck"
  | "bamboo-copter";

export type PetAnimationName =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

export type PetNotificationTone = "success" | "info" | "failure" | "working";

export interface PetNotificationDetail {
  animation?: PetAnimationName;
  durationMs?: number;
  message: string;
  tone?: PetNotificationTone;
}

export interface PetOption {
  accessory: PetAccessory;
  label: string;
  src: string;
}

export const PET_OPTIONS: PetOption[] = [
  {
    accessory: "none",
    label: "No accessory",
    src: "/pets/auri/spritesheet.webp",
  },
  {
    accessory: "flower",
    label: "Flower",
    src: "/pets/auri-flower/spritesheet.webp",
  },
  {
    accessory: "pencil",
    label: "Pencil",
    src: "/pets/auri-pencil/spritesheet.webp",
  },
  { accessory: "duck", label: "Duck", src: "/pets/auri-duck/spritesheet.webp" },
  {
    accessory: "bamboo-copter",
    label: "Bamboo copter",
    src: "/pets/auri-bamboo-copter/spritesheet.webp",
  },
];

export const DEFAULT_PET_NAME = "Auri";
export const DEFAULT_PET_ACCESSORY: PetAccessory = "none";

export function normalizePetAccessory(value: unknown): PetAccessory {
  return PET_OPTIONS.some((option) => option.accessory === value)
    ? (value as PetAccessory)
    : DEFAULT_PET_ACCESSORY;
}

export function normalizePetName(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 32)
    : DEFAULT_PET_NAME;
}

export function getPetOption(accessory: PetAccessory) {
  return (
    PET_OPTIONS.find((option) => option.accessory === accessory) ??
    PET_OPTIONS[0]
  );
}

export function emitPetNotification(detail: PetNotificationDetail) {
  window.dispatchEvent(
    new CustomEvent<PetNotificationDetail>(PET_NOTIFICATION_EVENT, { detail })
  );
}
