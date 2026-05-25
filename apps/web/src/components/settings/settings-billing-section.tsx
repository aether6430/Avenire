import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { getBillingValueState } from "@/components/settings/settings-billing-model";
import {
  Divider,
  PlanCard,
  Section,
  ToggleRow,
} from "@/components/settings/settings-panel-content-shared";
import { getRemotePreferencesState } from "@/components/settings/settings-preferences-model";
import {
  formatBytes,
  formatCredits,
  formatRefillAt,
  type SettingsPanelRuntime,
} from "@/components/settings/use-settings-panel";
import { BILLING_PLANS, formatInr } from "@/lib/billing-plans";

export function SettingsBillingSection({
  runtime,
}: {
  runtime: SettingsPanelRuntime;
}) {
  const {
    billingErrorMessage,
    billingLoadFailed,
    billingLoading,
    billingMeters,
    billingStatus,
    billingUsage,
    emailReceipts,
    handleManageBilling,
    handleUpgradePlan,
    hasPaidPlan,
    persistUserSettings,
    preferencesStatus,
    setEmailReceipts,
    currentPlanLabel,
    preferencesLoadFailed,
    preferencesLoading,
  } = runtime;
  const normalizedBillingStatus = billingStatus?.trim() || null;
  const normalizedBillingErrorMessage = billingErrorMessage?.trim() || null;
  const showBillingStatus =
    normalizedBillingStatus !== null &&
    normalizedBillingStatus !== normalizedBillingErrorMessage;
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
          kind: meter.kind,
          label: meter.label,
          refillLabel:
            meter.kind === "storage"
              ? `${formatBytes(meter.remaining)} available`
              : `Refills ${formatRefillAt(meter.refillAt ?? null)}`,
          totalLabel:
            meter.kind === "storage"
              ? formatBytes(meter.total)
              : formatCredits(meter.total),
          usedLabel:
            meter.kind === "storage" ? formatBytes(meter.used ?? 0) : null,
          valueState: getBillingValueState({
            loadFailed: false,
            loading: false,
            readyLabel:
              meter.kind === "storage"
                ? formatBytes(meter.used ?? 0)
                : formatCredits(meter.remaining),
          }),
        }))
      : [
          {
            kind: "credits" as const,
            label: "Method credits",
            refillLabel: billingLoadFailed
              ? "Usage unavailable"
              : "Refills loading...",
            totalLabel: null,
            usedLabel: null,
            valueState: getBillingValueState({
              errorMessage: billingErrorMessage,
              loadFailed: billingLoadFailed,
              loading: billingLoading,
              readyLabel: "0",
            }),
          },
          {
            kind: "storage" as const,
            label: "Storage",
            refillLabel: billingLoadFailed
              ? "Usage unavailable"
              : "Storage loading...",
            totalLabel: null,
            usedLabel: null,
            valueState: getBillingValueState({
              errorMessage: billingErrorMessage,
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
        {showBillingStatus ? (
          <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
            {normalizedBillingStatus.startsWith("Loading") ? (
              <Spinner className="size-3.5" />
            ) : null}
            {normalizedBillingStatus}
          </p>
        ) : null}
      </Section>

      <Divider />

      <Section description="" title="Choose Your Plan">
        <div className="grid gap-4 sm:grid-cols-3">
          <PlanCard
            current={billingUsage?.plan === "access"}
            features={BILLING_PLANS.access.features}
            name={BILLING_PLANS.access.label}
            onUpgrade={null}
            price={`${formatInr(BILLING_PLANS.access.monthly)}/month`}
          />
          <PlanCard
            current={billingUsage?.plan === "core"}
            features={BILLING_PLANS.core.features}
            name="Core"
            onUpgrade={() => {
              void handleUpgradePlan("core");
            }}
            popular
            price={`${formatInr(BILLING_PLANS.core.monthly)}/month`}
          />
          <PlanCard
            current={billingUsage?.plan === "scholar"}
            features={BILLING_PLANS.scholar.features}
            name="Scholar"
            onUpgrade={() => {
              void handleUpgradePlan("scholar");
            }}
            price={`${formatInr(BILLING_PLANS.scholar.monthly)}/month`}
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
        {showBillingStatus ? (
          <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
            {normalizedBillingStatus.startsWith("Loading") ? (
              <Spinner className="size-3.5" />
            ) : null}
            {normalizedBillingStatus}
          </p>
        ) : null}
      </Section>
    </>
  );
}
