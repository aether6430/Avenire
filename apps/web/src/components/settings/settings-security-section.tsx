import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import { Shield, Warning as TriangleAlert } from "@phosphor-icons/react";
import { Key } from "@phosphor-icons/react/ssr";
import type { PasskeyEntry } from "@/components/settings/settings-panel-model";
import { Divider, Section } from "./settings-panel-content-shared";
import { getPasskeysStateMessage } from "./settings-security-model";

export interface SettingsSecuritySectionRuntime {
  accountDeleteConfirm: string;
  addPasskey: () => Promise<void>;
  dangerStatus: string | null;
  deleteAccount: () => Promise<void>;
  passkeys: PasskeyEntry[];
  passkeysErrorMessage: string | null;
  passkeysLoadFailed: boolean;
  passkeysLoading: boolean;
  passkeysStatus: string | null;
  removePasskey: (id: string) => Promise<void>;
  revokeOtherDeviceSessions: () => Promise<void>;
  sessionsStatus: string | null;
  setAccountDeleteConfirm: (value: string) => void;
  sudoActive: boolean;
  sudoStatus: string | null;
  verifySudoSession: () => Promise<void>;
}

export function SettingsSecuritySection({
  runtime,
}: {
  runtime: SettingsSecuritySectionRuntime;
}) {
  const {
    accountDeleteConfirm,
    addPasskey,
    deleteAccount,
    dangerStatus,
    passkeys,
    passkeysErrorMessage,
    passkeysLoadFailed,
    passkeysLoading,
    passkeysStatus,
    removePasskey,
    revokeOtherDeviceSessions,
    sessionsStatus,
    setAccountDeleteConfirm,
    sudoActive,
    sudoStatus,
    verifySudoSession,
  } = runtime;
  const passkeysStateMessage = getPasskeysStateMessage({
    errorMessage: passkeysErrorMessage,
    loadFailed: passkeysLoadFailed,
    loading: passkeysLoading,
    passkeyCount: passkeys.length,
  });

  return (
    <>
      <Section
        description="Protected actions will prompt for a 6-digit verification code and stay approved for 12 hours."
        title="Sensitive Actions"
      >
        <div className="max-w-md space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Sudo verification</p>
              <p className="text-muted-foreground text-xs">
                {sudoActive
                  ? "Verified for this browser session."
                  : "You will only be prompted when you start a protected action."}
              </p>
            </div>
            <Badge variant={sudoActive ? "default" : "secondary"}>
              {sudoActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs">
            {sudoActive
              ? "Your current sudo session is valid for up to 12 hours."
              : "Deleting your account or a workspace will open a verification dialog automatically."}
          </p>
          <Button
            disabled={sudoActive}
            onClick={() => {
              void verifySudoSession();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {sudoActive ? "Verification Active" : "Verify Now"}
          </Button>
          {sudoStatus ? (
            <p className="text-muted-foreground text-xs">{sudoStatus}</p>
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section
        description="Add or remove passkeys for passwordless sign-in."
        title="Passkeys"
      >
        <div className="space-y-3">
          <Button
            onClick={() => {
              void addPasskey();
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <Key className="mr-2 h-4 w-4" />
            Add Passkey
          </Button>
          <div className="space-y-2">
            {passkeysStateMessage ? (
              <p className="text-muted-foreground text-xs">
                {passkeysStateMessage}
              </p>
            ) : (
              passkeys.map((passkey) => (
                <div
                  className="flex items-center justify-between px-0 py-1.5"
                  key={passkey.id}
                >
                  <div>
                    <p className="font-medium text-sm">
                      {passkey.name ?? "Passkey"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {passkey.deviceType ?? "Unknown device"}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      void removePasskey(passkey.id);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          {passkeysStatus ? (
            <p className="text-muted-foreground text-xs">{passkeysStatus}</p>
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section
        description="Manage and sign out from other devices that are currently logged in to your account."
        title="Active Sessions"
      >
        <Button
          onClick={() => {
            void revokeOtherDeviceSessions();
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Shield className="mr-2 h-4 w-4" />
          Sign Out Other Devices
        </Button>
        {sessionsStatus ? (
          <p className="text-muted-foreground text-xs">{sessionsStatus}</p>
        ) : null}
      </Section>

      <Divider />

      <Section
        description="Permanently delete your account. This action cannot be undone."
        title="Danger Zone"
      >
        <div className="max-w-md space-y-3">
          <div className="flex items-start gap-2 text-red-600">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs">
              Type <span className="font-semibold">DELETE MY ACCOUNT</span>. If
              needed, we will prompt for verification after you click delete.
            </p>
          </div>
          <Input
            onChange={(event) => setAccountDeleteConfirm(event.target.value)}
            placeholder="DELETE MY ACCOUNT"
            value={accountDeleteConfirm}
          />
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            disabled={accountDeleteConfirm.trim() !== "DELETE MY ACCOUNT"}
            onClick={() => {
              void deleteAccount();
            }}
            size="sm"
            type="button"
          >
            Delete Account
          </Button>
        </div>
        {dangerStatus ? (
          <p className="text-muted-foreground text-xs">{dangerStatus}</p>
        ) : null}
      </Section>
    </>
  );
}
