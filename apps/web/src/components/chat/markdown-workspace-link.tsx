"use client";

import { cn } from "@avenire/ui/lib/utils";
import { FileTextIcon } from "@phosphor-icons/react";
import type { Route } from "next";
import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useState } from "react";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";

const workspaceRouteCache = new Map<string, Route | null>();

export function WorkspaceFileLink({
  children,
  className,
  href,
  onClick,
  workspaceUuid,
  ...props
}: ComponentPropsWithoutRef<"a"> & {
  workspaceUuid?: string;
}) {
  const normalizedHref = typeof href === "string" ? href.trim() : "";
  const fileIdentifier = normalizedHref.startsWith("workspace-file://")
    ? decodeURIComponent(normalizedHref.replace("workspace-file://", "").trim())
    : "";
  const cacheKey =
    workspaceUuid && fileIdentifier
      ? `${workspaceUuid}:${fileIdentifier}`
      : undefined;
  const [resolvedRoute, setResolvedRoute] = useState<Route | null>(() =>
    cacheKey ? (workspaceRouteCache.get(cacheKey) ?? null) : null
  );

  useEffect(() => {
    let cancelled = false;

    if (!(workspaceUuid && fileIdentifier && cacheKey)) {
      setResolvedRoute(null);
      return;
    }

    const cachedRoute = workspaceRouteCache.get(cacheKey);
    if (cachedRoute !== undefined) {
      setResolvedRoute(cachedRoute);
      return;
    }

    resolveWorkspaceFileRoute(workspaceUuid, fileIdentifier)
      .then((route) => {
        if (!cancelled) {
          workspaceRouteCache.set(cacheKey, route);
          setResolvedRoute(route);
        }
      })
      .catch(() => {
        if (!cancelled) {
          workspaceRouteCache.set(cacheKey, null);
          setResolvedRoute(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, fileIdentifier, workspaceUuid]);

  return (
    <a
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/60 px-2.5 py-1 font-medium font-mono text-[11px] text-foreground no-underline hover:bg-muted",
        !resolvedRoute && "cursor-default opacity-80",
        className
      )}
      {...props}
      href={resolvedRoute ?? "#"}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (!resolvedRoute) {
          event.preventDefault();
          if (!(workspaceUuid && fileIdentifier && cacheKey)) {
            return;
          }
          resolveWorkspaceFileRoute(workspaceUuid, fileIdentifier)
            .then((route) => {
              workspaceRouteCache.set(cacheKey, route);
              setResolvedRoute(route);
              if (route) {
                window.location.assign(route);
              }
            })
            .catch(() => undefined);
        }
      }}
      rel="noreferrer"
      target="_self"
    >
      <FileTextIcon className="size-3.5 text-primary" />
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Source
      </span>
      <span>{children}</span>
    </a>
  );
}
