"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePaneHeaderActions } from "@/stores/header-store";

export function HeaderActions({ children }: { children: ReactNode }) {
  const { setActions } = usePaneHeaderActions();
  useEffect(() => {
    setActions(children);
    return () => {
      setActions(null);
    };
  }, [children, setActions]);
  return null;
}

export function HeaderBreadcrumbs({ children }: { children: ReactNode }) {
  const { setBreadcrumbs } = usePaneHeaderActions();
  useEffect(() => {
    setBreadcrumbs(children);
    return () => {
      setBreadcrumbs(null);
    };
  }, [children, setBreadcrumbs]);
  return null;
}

export function HeaderLeadingIcon({ children }: { children: ReactNode }) {
  const { setLeadingIcon } = usePaneHeaderActions();
  useEffect(() => {
    setLeadingIcon(children);
    return () => {
      setLeadingIcon(null);
    };
  }, [children, setLeadingIcon]);
  return null;
}
