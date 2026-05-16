import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import type { Route } from "next";
import { getBillingValueState } from "@/components/settings/settings-billing-model";
import {
  Divider,
  PlanCard,
  Section,
  ToggleRow,
} from "@/components/settings/settings-panel-content-shared";
import { getRemotePreferencesState } from "@/components/settings/settings-preferences-model";
import {
  formatCredits,
  formatRefillAt,
  type SettingsPanelRuntime,
} from "@/components/settings/use-settings-panel";

export function SettingsBillingSection({
  runtime,
}: {
  runtime: SettingsPanelRuntime;
}) {
  const {
    billingLoadFailed,
    billingLoading,
    billingMeters,
    billingStatus,
    billingUsage,
    emailReceipts,
    handleManageBilling,
    hasPaidPlan,
    persistUserSettings,
    preferencesStatus,
    router,
    setEmailReceipts,
    currentPlanLabel,
    preferencesLoadFailed,
    preferencesLoading,
  } = runtime;
  const remotePreferencesState = getRemotePreferencesState({
    loadFailed: preferencesLoadFailed,
    loading: preferencesLoading,
  });
  const showPreferencesStatus =
    preferencesStatus &&
    !(preferencesLoading || preferencesLoadFailed) &&
    !preferencesStatus.startsWith("Loading");
  const billingMeterCards =
    billingMeters.length > 0
      ? billingMeters.map((meter) => ({
          label: meter.label,
          refillLabel: `Refills ${formatRefillAt(meter.refillAt)}`,
          totalLabel: formatCredits(meter.total),
          valueState: getBillingValueState({
            loadFailed: false,
            loading: false,
            readyLabel: formatCredits(meter.remaining),
          }),
        }))
      : [
          {
            label: "Total credits",
            refillLabel: billingLoadFailed
              ? "Usage unavailable"
              : "Refills loading...",
            totalLabel: null,
            valueState: getBillingValueState({
              loadFailed: billingLoadFailed,
              loading: billingLoading,
              readyLabel: "0",
            }),
          },
          {
            label: "Method credits",
            refillLabel: billingLoadFailed
              ? "Usage unavailable"
              : "Refills loading...",
            totalLabel: null,
            valueState: getBillingValueState({
              loadFailed: billingLoadFailed,
              loading: billingLoading,
              readyLabel: "0",
            }),
          },
          {
            label: "Upload credits",
            refillLabel: billingLoadFailed
              ? "Usage unavailable"
              : "Refills loading...",
            totalLabel: null,
            valueState: getBillingValueState({
              loadFailed: billingLoadFailed,
              loading: billingLoading,
              readyLabel: "0",
            }),
          },
        ];

  return (
    <>
      <Section description="" title="Current Plan">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-background/60 p-4">
            <p className="text-muted-foreground text-xs">Plan</p>
            <p className="mt-1 font-semibold text-base">{currentPlanLabel}</p>
          </div>
          {billingMeterCards.map((meter) => (
            <div
              className="rounded-xl border border-border/60 bg-background/60 p-4"
              key={meter.label}
            >
              <p className="text-muted-foreground text-xs">{meter.label}</p>
              <p className="mt-1 font-semibold text-base">
                {meter.valueState.showSpinner ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Spinner className="size-4" />
                    {meter.valueState.label}
                  </span>
                ) : (
                  meter.valueState.label
                )}
                {meter.totalLabel ? (
                  <span className="font-normal text-muted-foreground text-xs">
                    {" "}
                    / {meter.totalLabel}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {meter.refillLabel}
              </p>
            </div>
          ))}
        </div>
        {billingStatus ? (
          <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
            {billingStatus.startsWith("Loading") ? (
              <Spinner className="size-3.5" />
            ) : null}
            {billingStatus}
          </p>
        ) : null}
      </Section>

      <Divider />

      <Section description="" title="Choose Your Plan">
        <div className="grid gap-4 sm:grid-cols-3">
          <PlanCard
            current={billingUsage?.plan === "access"}
            features={[
              "Small monthly limits for basic usage",
              "Basic models only",
            ]}
            name="Free"
            onUpgrade={null}
            price="$0/month"
          />
          <PlanCard
            current={billingUsage?.plan === "core"}
            features={[
              "Expanded monthly limits for more flexibility",
              "Access to all models",
              "File uploads and web search",
            ]}
            name="Core"
            onUpgrade={() => router.push("/pricing" as Route)}
            popular
            price="$8/month"
          />
          <PlanCard
            current={billingUsage?.plan === "scholar"}
            features={[
              "Over 10× Core limits for power users",
              "Includes everything in Core",
              "Priority support",
            ]}
            name="Scholar"
            onUpgrade={() => router.push("/pricing" as Route)}
            price="$50/month"
          />
        </div>
      </Section>

      <Divider />

      <Section description="" title="Billing Preferences">
        <div className="space-y-1">
          {remotePreferencesState.ready ? (
            <ToggleRow
              checked={emailReceipts}
              description="Send receipts to your account email when a payment succeeds."
              label="Email me receipts"
              onCheckedChange={(nextValue) => {
                const previous = emailReceipts;
                setEmailReceipts(nextValue);
                void persistUserSettings({ emailReceipts: nextValue }, () =>
                  setEmailReceipts(previous)
                );
              }}
            />
          ) : (
            <p className="mt-2 text-muted-foreground text-xs">
              {remotePreferencesState.message}
            </p>
          )}
          {showPreferencesStatus ? (
            <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
              {preferencesStatus}
            </p>
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section description="" title="Manage Subscription">
        <Button
          onClick={() => {
            void handleManageBilling();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          {hasPaidPlan ? "Manage Billing & Invoices" : "View Plans"}
        </Button>
        {billingStatus ? (
          <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
            {billingStatus.startsWith("Loading") ? (
              <Spinner className="size-3.5" />
            ) : null}
            {billingStatus}
          </p>
        ) : null}
      </Section>
    </>
  );
}
