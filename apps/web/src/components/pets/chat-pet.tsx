"use client";

import { Button } from "@avenire/ui/components/button";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PET_NAME,
  getPetOption,
  PET_NOTIFICATION_EVENT,
  PET_POSITION_STORAGE_KEY,
  PET_VISIBILITY_STORAGE_KEY,
  type PetAnimationName,
  type PetNotificationDetail,
} from "@/lib/pet-preferences";
import { useUserSettings } from "@/lib/user-settings-client";
import { cn } from "@/lib/utils";
import { SpritePet } from "./sprite-pet";

function getStoredVisibility() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(PET_VISIBILITY_STORAGE_KEY) === "true";
}

const PET_SCALE = 0.45;
const PET_SIZE = {
  width: 192 * PET_SCALE,
  height: 208 * PET_SCALE,
};
const POSITION_PADDING = 12;

interface PetPosition {
  x: number;
  y: number;
}

function clampPosition(position: PetPosition): PetPosition {
  if (typeof window === "undefined") {
    return position;
  }

  return {
    x: Math.min(
      Math.max(POSITION_PADDING, position.x),
      Math.max(
        POSITION_PADDING,
        window.innerWidth - PET_SIZE.width - POSITION_PADDING
      )
    ),
    y: Math.min(
      Math.max(POSITION_PADDING, position.y),
      Math.max(
        POSITION_PADDING,
        window.innerHeight - PET_SIZE.height - POSITION_PADDING
      )
    ),
  };
}

function getDefaultPosition(): PetPosition {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  return clampPosition({
    x: window.innerWidth / 2 - PET_SIZE.width / 2,
    y: window.innerHeight * 0.3,
  });
}

function getStoredPosition(): PetPosition {
  if (typeof window === "undefined") {
    return getDefaultPosition();
  }

  const raw = window.localStorage.getItem(PET_POSITION_STORAGE_KEY);
  if (!raw) {
    return getDefaultPosition();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PetPosition>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return clampPosition(parsed as PetPosition);
    }
  } catch {
    return getDefaultPosition();
  }

  return getDefaultPosition();
}

function savePosition(position: PetPosition) {
  window.localStorage.setItem(
    PET_POSITION_STORAGE_KEY,
    JSON.stringify(clampPosition(position))
  );
}

export function ChatPet() {
  const { settings } = useUserSettings();
  const [visible, setVisible] = useState(getStoredVisibility);
  const [animation, setAnimation] = useState<PetAnimationName>("idle");
  const [position, setPosition] = useState(getStoredPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] =
    useState<PetNotificationDetail | null>(null);
  const clearNotificationRef = useRef<number | null>(null);
  const hardClickCountRef = useRef(0);
  const hardClickTimerRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<PetPosition>({ x: 0, y: 0 });
  const dragStartedRef = useRef(false);
  const petName = settings.petName ?? DEFAULT_PET_NAME;
  const petOption = useMemo(
    () => getPetOption(settings.petAccessory),
    [settings.petAccessory]
  );

  const showNotification = useCallback((detail: PetNotificationDetail) => {
    if (clearNotificationRef.current) {
      window.clearTimeout(clearNotificationRef.current);
    }

    setNotification(detail);
    setAnimation(
      detail.animation ??
        (detail.tone === "failure"
          ? "failed"
          : detail.tone === "working"
            ? "waiting"
            : "waving")
    );
    clearNotificationRef.current = window.setTimeout(() => {
      setNotification(null);
      setAnimation("idle");
      clearNotificationRef.current = null;
    }, detail.durationMs ?? 3600);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => {
        const next = clampPosition(current);
        savePosition(next);
        return next;
      });
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !((event.metaKey || event.ctrlKey) && event.shiftKey) ||
        event.altKey
      ) {
        return;
      }
      if (event.key.toLowerCase() !== "y") {
        return;
      }
      event.preventDefault();
      setVisible((current) => {
        const next = !current;
        window.localStorage.setItem(PET_VISIBILITY_STORAGE_KEY, String(next));
        return next;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePetNotification = (event: Event) => {
      showNotification(
        (event as CustomEvent<PetNotificationDetail>).detail ?? {
          message: "Done",
        }
      );
    };

    window.addEventListener(PET_NOTIFICATION_EVENT, handlePetNotification);
    return () => {
      window.removeEventListener(PET_NOTIFICATION_EVENT, handlePetNotification);
    };
  }, [showNotification]);

  useEffect(
    () => () => {
      if (clearNotificationRef.current) {
        window.clearTimeout(clearNotificationRef.current);
      }
      if (hardClickTimerRef.current) {
        window.clearTimeout(hardClickTimerRef.current);
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      dragOffsetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      dragStartedRef.current = false;
      setIsDragging(true);
      setAnimation("jumping");
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging) {
        return;
      }

      dragStartedRef.current = true;
      setAnimation("jumping");
      setPosition(
        clampPosition({
          x: event.clientX - dragOffsetRef.current.x,
          y: event.clientY - dragOffsetRef.current.y,
        })
      );
    },
    [isDragging]
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!isDragging) {
        return;
      }

      setIsDragging(false);
      setPosition((current) => {
        const next = clampPosition(current);
        savePosition(next);
        return next;
      });
      setAnimation(notification ? animation : "idle");
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [animation, isDragging, notification]
  );

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-label={`${petName}, your workspace pet`}
      className="pointer-events-none fixed top-0 left-0 z-[120] flex items-start justify-center"
      role="status"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      <Button
        aria-label={`Interact with ${petName}`}
        className={cn(
          "pointer-events-auto relative h-auto rounded-full border-0 bg-transparent p-0 shadow-none",
          "touch-none select-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary/70",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onClick={() => {
          if (dragStartedRef.current) {
            dragStartedRef.current = false;
            return;
          }
          hardClickCountRef.current += 1;
          if (hardClickTimerRef.current) {
            window.clearTimeout(hardClickTimerRef.current);
          }
          hardClickTimerRef.current = window.setTimeout(() => {
            hardClickCountRef.current = 0;
            hardClickTimerRef.current = null;
          }, 700);

          if (hardClickCountRef.current >= 4) {
            hardClickCountRef.current = 0;
            showNotification({
              message: "Easy there",
              tone: "failure",
              animation: "failed",
              durationMs: 2400,
            });
            return;
          }

          setAnimation("jumping");
        }}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        type="button"
      >
        {notification ? (
          <span
            className={cn(
              "absolute -top-2 -right-3 max-w-[9rem] rounded-full border px-2.5 py-1 font-medium text-[11px] shadow-lg backdrop-blur",
              notification.tone === "failure"
                ? "border-red-500/30 bg-red-500/15 text-red-100"
                : "border-primary/30 bg-background/90 text-foreground"
            )}
          >
            {notification.message}
          </span>
        ) : null}
        <SpritePet
          animation={animation}
          onAnimationComplete={() => {
            if (!isDragging) {
              setAnimation("idle");
            }
          }}
          scale={PET_SCALE}
          src={petOption.src}
        />
      </Button>
    </div>
  );
}
