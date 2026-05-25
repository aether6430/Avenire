"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import { Input } from "@avenire/ui/components/input";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";
import { SensitiveText } from "@/components/shared/sensitive-text";

export function SettingsPanelDialogs({
  runtime,
}: {
  runtime: SettingsPanelRuntime;
}) {
  const {
    codeRequestedForSessionRef,
    pendingSudoActionRef,
    privacyMode,
    session,
    setSudoCode,
    setSudoDialogOpen,
    sudoActionLabel,
    sudoCode,
    sudoDialogOpen,
    sudoRequestingCode,
    sudoStatus,
    sudoVerifyingCode,
    requestSudoCode,
    verifySudoCodeAndContinue,
  } = runtime;

  return (
    <Dialog
      onOpenChange={(open) => {
        setSudoDialogOpen(open);
        if (!open) {
          codeRequestedForSessionRef.current = false;
          pendingSudoActionRef.current = null;
          setSudoCode("");
        }
      }}
      open={sudoDialogOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Sensitive Action</DialogTitle>
          <DialogDescription>
            Enter the 6-digit code sent to{" "}
            <SensitiveText
              className="inline-block align-baseline"
              privacyMode={privacyMode}
              value={session?.user?.email}
            />{" "}
            to {sudoActionLabel}. Approval stays active for 12 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            className="text-center tracking-[0.35em]"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) =>
              setSudoCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="123456"
            value={sudoCode}
          />
          {sudoStatus ? (
            <p className="text-muted-foreground text-xs">{sudoStatus}</p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            disabled={sudoRequestingCode}
            onClick={() => {
              void requestSudoCode();
            }}
            type="button"
            variant="outline"
          >
            {sudoRequestingCode ? "Sending..." : "Resend Code"}
          </Button>
          <Button
            disabled={sudoCode.trim().length !== 6 || sudoVerifyingCode}
            onClick={() => {
              void verifySudoCodeAndContinue();
            }}
            type="button"
          >
            {sudoVerifyingCode ? "Verifying..." : "Verify and Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
