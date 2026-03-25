"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function HeaderActions({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById("workspace-header-actions"));
  }, []);
  if (!target) return null;
  return createPortal(children, target);
}

export function HeaderBreadcrumbs({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById("workspace-header-breadcrumbs"));
  }, []);
  if (!target) return null;
  return createPortal(children, target);
}

export function HeaderLeadingIcon({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById("workspace-header-leading-icon"));
  }, []);
  if (!target) return null;
  return createPortal(children, target);
}
