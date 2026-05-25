import { getYearlyDiscountPercent } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";

export type BillingCycle = "monthly" | "yearly";

const cycleTabs: Array<{
  badge?: string;
  label: string;
  value: BillingCycle;
}> = [
  { label: "Monthly", value: "monthly" },
  {
    badge: `Save ${getYearlyDiscountPercent("core")}%`,
    label: "Yearly",
    value: "yearly",
  },
];

export function BillingCycleTabs({
  className,
  cycle,
  onChange,
}: {
  className?: string;
  cycle: BillingCycle;
  onChange: (value: BillingCycle) => void;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1",
        className
      )}
    >
      {cycleTabs.map((tab) => {
        const isActive = tab.value === cycle;

        return (
          <button
            aria-pressed={isActive}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 font-medium text-sm transition duration-150",
              isActive
                ? "bg-brand text-[var(--primary-foreground)]"
                : "text-white/68 hover:bg-white/6 hover:text-white"
            )}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            <span>{tab.label}</span>
            {tab.badge ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  isActive
                    ? "bg-black/10 text-[var(--primary-foreground)]"
                    : "bg-brand/12 text-brand"
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
