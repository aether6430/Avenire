"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useHeaderStore } from "@/stores/header-store";

export function HeaderActions({ children }: { children: ReactNode }) {
  const setActions = useHeaderStore((state) => state.setActions);
  useEffect(() => {
    setActions(children);
    return () => {
      setActions(null);
    };
  }, [children, setActions]);
  return null;
}

export function HeaderBreadcrumbs({ children }: { children: ReactNode }) {
  const setBreadcrumbs = useHeaderStore((state) => state.setBreadcrumbs);
  useEffect(() => {
    setBreadcrumbs(children);
    return () => {
      setBreadcrumbs(null);
    };
  }, [children, setBreadcrumbs]);
  return null;
}

export function HeaderLeadingIcon({ children }: { children: ReactNode }) {
  const setLeadingIcon = useHeaderStore((state) => state.setLeadingIcon);
  useEffect(() => {
    setLeadingIcon(children);
    return () => {
      setLeadingIcon(null);
    };
  }, [children, setLeadingIcon]);
  return null;
}
