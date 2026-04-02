"use client";

import { Button } from "@avenire/ui/components/button";
import { Calendar } from "@avenire/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avenire/ui/components/popover";
import { cn } from "@avenire/ui/lib/utils";
import { CalendarDots, CaretDown, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

const DEFAULT_DUE_TIME = "23:59";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseLocalDateTime(value: string) {
  if (!value.trim()) {
    return null;
  }

  const [datePart, timePart] = value.split("T");
  const dateSegments = datePart?.split("-").map((segment) => Number(segment));
  if (
    !dateSegments ||
    dateSegments.length !== 3 ||
    dateSegments.some((segment) => Number.isNaN(segment))
  ) {
    return null;
  }

  const [year, month, day] = dateSegments;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    time:
      typeof timePart === "string" && /^\d{2}:\d{2}/.test(timePart)
        ? timePart.slice(0, 5)
        : DEFAULT_DUE_TIME,
  };
}

function toLocalDateTimeValue(date: Date, time: string) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${time}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(time: string) {
  const [hours, minutes] = time.split(":").map((segment) => Number(segment));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "11:59 PM";
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${pad(minutes)} ${period}`;
}

export function TaskDueDatePicker({
  className,
  disabled = false,
  id,
  onChange,
  value,
}: {
  className?: string;
  disabled?: boolean;
  id?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const parsedValue = useMemo(() => parseLocalDateTime(value), [value]);
  const selectedDate = parsedValue?.date ?? null;
  const selectedTime = parsedValue?.time ?? DEFAULT_DUE_TIME;

  const handleSelect = (date?: Date) => {
    if (!date) {
      return;
    }

    onChange(toLocalDateTimeValue(date, selectedTime));
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <div className="flex gap-2">
        <PopoverTrigger
          disabled={disabled}
          id={id}
          render={
            <Button
              className={cn(
                "h-auto w-full justify-between gap-3 px-3 py-2 text-left font-normal",
                !selectedDate && "text-muted-foreground",
                className
              )}
              type="button"
              variant="outline"
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <CalendarDots className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block truncate text-sm">
                {selectedDate
                  ? `${formatDateLabel(selectedDate)} • ${formatTimeLabel(selectedTime)}`
                  : "Add due date"}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Defaults to 11:59 PM when no time is supplied.
              </span>
            </span>
          </span>
          <CaretDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        {selectedDate ? (
          <Button
            aria-label="Clear due date"
            className="shrink-0"
            disabled={disabled}
            onClick={() => onChange("")}
            size="icon"
            type="button"
            variant="outline"
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <PopoverContent
        align="start"
        className="w-auto rounded-xl border border-border/70 p-2 shadow-lg"
        sideOffset={8}
      >
        <Calendar
          className="p-0"
          mode="single"
          onSelect={handleSelect}
          selected={selectedDate ?? undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
