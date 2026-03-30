"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@avenire/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@avenire/ui/components/popover";
import {
  ChatCenteredText,
  Folder,
  Files,
  LinkSimple,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type {
  WorkspaceTaskResourceLink,
  WorkspaceTaskResourceOption,
} from "@/lib/tasks";
import { getTaskResourceTypeLabel } from "@/lib/tasks";

function resourceKey(resource: WorkspaceTaskResourceLink | WorkspaceTaskResourceOption) {
  return `${resource.resourceType}:${resource.resourceId}`;
}

function resourceIcon(resourceType: WorkspaceTaskResourceLink["resourceType"]) {
  switch (resourceType) {
    case "chat":
      return ChatCenteredText;
    case "folder":
      return Folder;
    case "file":
    default:
      return Files;
  }
}

function resourceLabel(resource: WorkspaceTaskResourceLink | WorkspaceTaskResourceOption) {
  return resource.title || "Resource";
}

export function TaskResourcePicker({
  disabled = false,
  onChange,
  value,
  workspaceUuid,
}: {
  disabled?: boolean;
  onChange: (value: WorkspaceTaskResourceLink[]) => void;
  value: WorkspaceTaskResourceLink[];
  workspaceUuid: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<WorkspaceTaskResourceOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !workspaceUuid) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      void fetch(
        `/api/workspaces/${workspaceUuid}/tasks/resources?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal, cache: "no-store" }
      )
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Unable to load task resources.");
          }
          const payload = (await response.json()) as {
            resources?: WorkspaceTaskResourceOption[];
          };
          setOptions(payload.resources ?? []);
        })
        .catch(() => {
          setOptions([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [open, query, workspaceUuid]);

  const selectedMap = useMemo(
    () => new Map(value.map((resource) => [resourceKey(resource), resource])),
    [value]
  );

  const selectedCount = value.length;

  const toggleResource = (resource: WorkspaceTaskResourceOption) => {
    const key = resourceKey(resource);
    const next = new Map(selectedMap);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.set(key, resource);
    }
    onChange(Array.from(next.values()));
  };

  return (
    <div className="space-y-2">
      <Popover
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setQuery("");
            setOptions([]);
          }
        }}
        open={open}
      >
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              className="h-auto w-full justify-between gap-3 px-3 py-2 text-left font-normal"
              type="button"
              variant="outline"
            />
          }
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm">
              {selectedCount > 0
                ? `${selectedCount} linked resource${selectedCount === 1 ? "" : "s"}`
                : "Link resources"}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              Files, folders, and methods from the workspace
            </span>
          </span>
          <LinkSimple className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(32rem,calc(100vw-1rem))] rounded-xl border border-border/70 p-0 shadow-lg"
          sideOffset={8}
        >
          <Command className="p-0">
            <CommandInput
              onValueChange={setQuery}
              placeholder="Search files, folders, and methods..."
              value={query}
            />
            <CommandList className="max-h-80">
              <CommandEmpty>
                {loading ? "Loading resources..." : "No resources match that search."}
              </CommandEmpty>
              <CommandGroup heading="Workspace resources">
                {options.map((resource) => {
                  const Icon = resourceIcon(resource.resourceType);
                  const selected = selectedMap.has(resourceKey(resource));
                  return (
                    <CommandItem
                      key={resourceKey(resource)}
                      onSelect={() => toggleResource(resource)}
                      value={[resource.title, resource.subtitle ?? "", resource.resourceId].join(" ")}
                    >
                      <Icon className="size-3.5 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-xs">
                          {resourceLabel(resource)}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {getTaskResourceTypeLabel(resource.resourceType)}
                          {resource.subtitle ? ` • ${resource.subtitle}` : ""}
                        </p>
                      </div>
                      {selected ? (
                        <Badge className="rounded-sm" variant="secondary">
                          Selected
                        </Badge>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((resource) => {
            const Icon = resourceIcon(resource.resourceType);
            return (
              <Badge
                className="inline-flex max-w-full items-center gap-1 rounded-sm border-border/70 bg-secondary/50 px-2 py-1 text-[11px] font-normal text-foreground"
                key={resourceKey(resource)}
                variant="outline"
              >
                <Icon className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{resource.title}</span>
                <button
                  aria-label={`Remove ${resource.title}`}
                  className="ml-1 rounded-sm p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() =>
                    onChange(value.filter((entry) => resourceKey(entry) !== resourceKey(resource)))
                  }
                  type="button"
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
