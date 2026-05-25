import { Button } from "@avenire/ui/components/button";
import { Switch } from "@avenire/ui/components/switch";
import { Check } from "@phosphor-icons/react";
import type { ComponentType, ReactNode, SVGProps } from "react";

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold text-lg">{title}</h2>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function Divider() {
  return <div className="border-border/40 border-t" />;
}

export function UsageStatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: ReactNode;
  description: string;
}) {
  return (
    <div className="p-0">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">{label}</p>
          <p className="mt-3 font-semibold text-xl tracking-tight">{value}</p>
          <p className="mt-2 text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-0 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function PlanCard({
  name,
  price,
  features,
  current,
  popular,
  onUpgrade,
}: {
  name: string;
  price: string;
  features: string[];
  current: boolean;
  popular?: boolean;
  onUpgrade: (() => void) | null;
}) {
  return (
    <div
      className={[
        "relative flex flex-col gap-4 py-1 transition-all",
        popular ? "text-foreground" : "text-muted-foreground",
      ].join(" ")}
    >
      {popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-transparent px-3 py-0.5 font-semibold text-[11px] text-primary">
          Most Popular
        </span>
      ) : null}
      <div>
        <p className="font-semibold text-base">{name}</p>
        <p className="mt-0.5 text-muted-foreground text-xs">{price}</p>
      </div>
      <ul className="flex-1 space-y-1.5">
        {features.map((feature) => (
          <li
            className="flex items-start gap-2 text-muted-foreground text-xs"
            key={feature}
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {current ? (
        <Button className="w-full" disabled size="sm" variant="outline">
          Current Plan
        </Button>
      ) : (
        <Button className="w-full" onClick={onUpgrade ?? undefined} size="sm">
          Upgrade
        </Button>
      )}
    </div>
  );
}
