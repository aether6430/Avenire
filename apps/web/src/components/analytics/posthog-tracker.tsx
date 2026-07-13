"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { startProductionPerformanceProfiler } from "@/lib/production-performance-profiler";

function getDistinctId() {
  const key = "avenire_distinct_id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const next =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

function capture(event: string, properties: Record<string, unknown>) {
  const body = JSON.stringify({
    distinctId: getDistinctId(),
    event,
    properties,
  });

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/capture", blob);
    return;
  }

  void fetch("/api/analytics/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}

export function PostHogTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enteredAtRef = useRef<number>(Date.now());
  const currentPathRef = useRef<string>("");

  const search = useMemo(() => searchParams?.toString() ?? "", [searchParams]);

  useEffect(() => {
    const path = `${pathname}${search ? `?${search}` : ""}`;
    currentPathRef.current = path;
    enteredAtRef.current = Date.now();

    capture("web.pageview", {
      path,
      search,
      referrer: document.referrer,
      title: document.title,
      viewport: {
        height: window.innerHeight,
        width: window.innerWidth,
      },
    });
  }, [pathname, search]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    return startProductionPerformanceProfiler({
      capture,
      getPath: () => currentPathRef.current.split("?", 1)[0] ?? "",
    });
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      capture("web.session.end", {
        path: currentPathRef.current,
        durationMs: Date.now() - enteredAtRef.current,
      });
    };

    const handleError = (event: ErrorEvent) => {
      void fetch("/api/analytics/capture", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          error: event.message,
          path: currentPathRef.current,
        }),
        keepalive: true,
      });
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
