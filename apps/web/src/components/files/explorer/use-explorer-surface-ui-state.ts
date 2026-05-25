"use client";

import { useCallback, useState } from "react";
import type { ExplorerPropertiesItem } from "@/components/files/explorer/explorer-content-dialog-model";
import type { ExplorerMobileConfirmAction } from "@/components/files/explorer/explorer-mobile-actions-model";

export function useExplorerSurfaceUiState() {
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesItem, setPropertiesItem] =
    useState<ExplorerPropertiesItem | null>(null);
  const [mobileCreateMenuOpen, setMobileCreateMenuOpen] = useState(false);
  const [mobileConfirmAction, setMobileConfirmAction] =
    useState<ExplorerMobileConfirmAction | null>(null);

  const openPropertiesItem = useCallback((item: ExplorerPropertiesItem) => {
    setPropertiesItem(item);
    setPropertiesOpen(true);
  }, []);

  const openMobileCreateMenu = useCallback(() => {
    setMobileCreateMenuOpen(true);
  }, []);

  return {
    mobileConfirmAction,
    mobileCreateMenuOpen,
    openMobileCreateMenu,
    openPropertiesItem,
    propertiesItem,
    propertiesOpen,
    setMobileConfirmAction,
    setMobileCreateMenuOpen,
    setPropertiesItem,
    setPropertiesOpen,
  };
}
