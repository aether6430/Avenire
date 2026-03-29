"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@avenire/ui/components/avatar";
import { Button } from "@avenire/ui/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@avenire/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@avenire/ui/components/popover";
import { cn } from "@avenire/ui/lib/utils";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { WorkspaceMemberOption } from "@/lib/tasks";
import { getTaskInitials } from "@/lib/tasks";

function getMemberLabel(member: WorkspaceMemberOption) {
  return member.name?.trim() || member.email?.trim() || "Member";
}

function getMemberSearchValue(member: WorkspaceMemberOption) {
  return [member.name ?? "", member.email ?? "", member.userId ?? ""]
    .join(" ")
    .toLowerCase();
}

export function TaskAssigneePicker({
  disabled = false,
  members,
  onChange,
  value,
}: {
  disabled?: boolean;
  members: WorkspaceMemberOption[];
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedMembers = useMemo(
    () =>
      members.filter(
        (member): member is WorkspaceMemberOption & { userId: string } =>
          typeof member.userId === "string" && member.userId.length > 0
      ),
    [members]
  );

  const selectedMember = useMemo(
    () => normalizedMembers.find((member) => member.userId === value) ?? null,
    [normalizedMembers, value]
  );

  const filteredMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return normalizedMembers;
    }

    return normalizedMembers.filter((member) =>
      getMemberSearchValue(member).includes(needle)
    );
  }, [normalizedMembers, query]);

  const selectedLabel = selectedMember ? getMemberLabel(selectedMember) : "Assign to";

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
      open={open}
    >
      <PopoverTrigger
        disabled={disabled || normalizedMembers.length === 0}
        render={
          <Button
            className={cn(
              "h-auto w-full justify-between gap-3 px-3 py-2 text-left font-normal",
              !selectedMember && "text-muted-foreground"
            )}
            type="button"
            variant="outline"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6 shrink-0" size="sm">
            {selectedMember?.avatar ? (
              <AvatarImage src={selectedMember.avatar} />
            ) : null}
            <AvatarFallback>
              {selectedMember
                ? getTaskInitials(selectedMember.name, selectedMember.email)
                : "?"}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm">{selectedLabel}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {selectedMember?.email ?? "Search workspace members or email"}
            </span>
          </span>
        </span>
        <CaretUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(24rem,calc(100vw-1rem))] rounded-xl border border-border/70 p-0 shadow-lg"
        sideOffset={8}
      >
        <Command className="p-0">
          <CommandInput
            onValueChange={setQuery}
            placeholder="Search name or email..."
            value={query}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>No workspace member matches that search.</CommandEmpty>
            <CommandGroup heading="Workspace members">
              {filteredMembers.map((member) => {
                const label = getMemberLabel(member);
                return (
                  <CommandItem
                    key={member.userId}
                    onSelect={() => {
                      onChange(member.userId);
                      setOpen(false);
                    }}
                    value={getMemberSearchValue(member)}
                  >
                    <Avatar className="size-7 shrink-0" size="sm">
                      {member.avatar ? <AvatarImage src={member.avatar} /> : null}
                      <AvatarFallback>
                        {getTaskInitials(member.name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-xs">{label}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {member.email ?? member.userId}
                      </p>
                    </div>
                    {member.userId === value ? (
                      <Check className="size-3.5 text-primary" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
