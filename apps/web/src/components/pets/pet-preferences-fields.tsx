"use client";

import { Input } from "@avenire/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { cn } from "@avenire/ui/lib/utils";
import { PET_OPTIONS, type PetAccessory } from "@/lib/pet-preferences";

interface PetPreferencesFieldsProps {
  accessory: PetAccessory;
  accessoryDescription?: string;
  className?: string;
  name: string;
  nameDescription?: string;
  namePlaceholder?: string;
  onAccessoryChange: (value: PetAccessory) => void;
  onNameBlur?: () => void;
  onNameChange: (value: string) => void;
}

export function PetPreferencesFields({
  accessory,
  accessoryDescription = "Choose one accessory for your pet. You can change it later.",
  className,
  name,
  nameDescription = "Pick a name that will show up across the workspace.",
  namePlaceholder = "Auri",
  onAccessoryChange,
  onNameBlur,
  onNameChange,
}: PetPreferencesFieldsProps) {
  return (
    <div
      className={cn(
        "grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm sm:grid-cols-2",
        className
      )}
    >
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="font-medium text-sm">Pet name</p>
          <p className="text-muted-foreground text-xs">{nameDescription}</p>
        </div>
        <Input
          aria-label="Pet name"
          className="h-9"
          maxLength={32}
          onBlur={onNameBlur}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={namePlaceholder}
          value={name}
        />
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <p className="font-medium text-sm">Accessory</p>
          <p className="text-muted-foreground text-xs">{accessoryDescription}</p>
        </div>
        <Select
          onValueChange={(value) => onAccessoryChange(value as PetAccessory)}
          value={accessory}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="No accessory" />
          </SelectTrigger>
          <SelectContent>
            {PET_OPTIONS.map((option) => (
              <SelectItem key={option.accessory} value={option.accessory}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
