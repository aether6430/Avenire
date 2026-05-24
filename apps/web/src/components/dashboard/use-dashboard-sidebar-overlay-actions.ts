"use client";

import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { HapticFeedbackType } from "@/hooks/use-haptics";
import { buildSettingsOverlayRoute } from "@/lib/settings-overlay-route";
import { filesUiActions } from "@/stores/filesUiStore";

export function useDashboardSidebarOverlayActions({
  isMobile,
  pathname,
  router,
  searchParams,
  setOpenMobile,
  setTrashOpen,
  triggerHaptic,
}: {
  isMobile: boolean;
  pathname: string;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
  setOpenMobile: (open: boolean) => void;
  setTrashOpen: (open: boolean) => void;
  triggerHaptic: (pattern?: HapticFeedbackType) => void;
}) {
  const closeMobileSidebar = useCallback(() => {
    setOpenMobile(false);
  }, [setOpenMobile]);

  const openOverlayAfterCollapse = useCallback(
    (openOverlay: () => void) => {
      if (!isMobile) {
        openOverlay();
        return;
      }

      closeMobileSidebar();
      requestAnimationFrame(() => {
        requestAnimationFrame(openOverlay);
      });
    },
    [closeMobileSidebar, isMobile]
  );

  const openTrash = useCallback(() => {
    void triggerHaptic("selection");
    openOverlayAfterCollapse(() => setTrashOpen(true));
  }, [openOverlayAfterCollapse, setTrashOpen, triggerHaptic]);

  const openUploadActivity = useCallback(() => {
    void triggerHaptic("selection");
    openOverlayAfterCollapse(() => {
      filesUiActions.toggleUploadActivityOpen();
    });
  }, [openOverlayAfterCollapse, triggerHaptic]);

  const openSettings = useCallback(() => {
    void triggerHaptic("selection");
    openOverlayAfterCollapse(() => {
      router.replace(
        buildSettingsOverlayRoute({
          pathname,
          searchParams,
          tab: "account",
        }) as Route
      );
    });
  }, [openOverlayAfterCollapse, pathname, router, searchParams, triggerHaptic]);

  return {
    closeMobileSidebar,
    openSettings,
    openTrash,
    openUploadActivity,
  };
}
