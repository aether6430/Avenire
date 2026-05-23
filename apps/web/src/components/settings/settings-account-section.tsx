import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avenire/ui/components/avatar";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { DitherIdenticon } from "@avenire/ui/components/dither-identicon";
import { Input } from "@avenire/ui/components/input";
import { Globe, LinkBreak as Unlink } from "@phosphor-icons/react";
import { Camera, GithubLogo as Github } from "@phosphor-icons/react/ssr";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";
import { SensitiveText } from "../shared/sensitive-text";
import { getConnectedAccountsStateMessage } from "./settings-account-model";
import { Divider, Section } from "./settings-panel-content-shared";

export function SettingsAccountSection({
  runtime,
}: {
  runtime: SettingsPanelRuntime;
}) {
  const {
    accounts,
    accountsErrorMessage,
    accountsLoadFailed,
    accountsLoading,
    accountsStatus,
    avatarSeed,
    avatarUploading,
    displayAvatar,
    fileInputRef,
    handleAvatarFileChange,
    isSavingProfile,
    isUploadingAvatar,
    linkAccountProvider,
    privacyMode,
    profileName,
    profileStatus,
    saveProfile,
    setProfileName,
    unlinkProviderAccount,
  } = runtime;
  const accountsStateMessage = getConnectedAccountsStateMessage({
    accountCount: accounts.length,
    errorMessage: accountsErrorMessage,
    loadFailed: accountsLoadFailed,
    loading: accountsLoading,
  });

  return (
    <>
      <Section
        description="Update your display name and avatar."
        title="Profile"
      >
        <div className="max-w-md space-y-3">
          <div className="space-y-1">
            <label className="font-medium text-muted-foreground text-xs">
              Display Name
            </label>
            <Input
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Your name"
              value={profileName}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                {displayAvatar ? (
                  <AvatarImage alt={profileName} src={displayAvatar} />
                ) : null}
                <AvatarFallback className="overflow-hidden bg-muted text-foreground">
                  <DitherIdenticon className="size-full" seed={avatarSeed} />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-sm">Profile photo</p>
                <p className="text-muted-foreground text-xs">
                  Upload an image and we will save the CDN URL to your account
                  automatically.
                </p>
              </div>
            </div>
            <input
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
              ref={fileInputRef}
              type="file"
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
                size="sm"
                type="button"
                variant="outline"
              >
                <Camera className="mr-2 h-4 w-4" />
                {avatarUploading ? "Uploading..." : "Upload Avatar"}
              </Button>
            </div>
          </div>
          <Button
            disabled={isSavingProfile || isUploadingAvatar}
            onClick={() => {
              void saveProfile();
            }}
            size="sm"
            type="button"
          >
            Save Changes
          </Button>
          {profileStatus ? (
            <p className="text-muted-foreground text-xs">{profileStatus}</p>
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section
        description="Link your Google or GitHub account for social sign-in."
        title="Connected Providers"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                void linkAccountProvider("google");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Globe className="mr-2 h-4 w-4" />
              Connect Google
            </Button>
            <Button
              onClick={() => {
                void linkAccountProvider("github");
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub
            </Button>
          </div>
          <div className="space-y-2">
            {accountsStateMessage ? (
              <p className="text-muted-foreground text-xs">
                {accountsStateMessage}
              </p>
            ) : (
              accounts.map((account) => (
                <div
                  className="flex items-center justify-between px-0 py-1.5"
                  key={
                    account.id ?? `${account.providerId}-${account.accountId}`
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs" variant="outline">
                      {account.providerId ?? "email"}
                    </Badge>
                    <SensitiveText
                      className="max-w-[180px] text-muted-foreground text-xs"
                      privacyMode={privacyMode}
                      value={account.accountId ?? account.id}
                    />
                  </div>
                  <Button
                    onClick={() => {
                      void unlinkProviderAccount(account);
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
          {accountsStatus ? (
            <p className="text-muted-foreground text-xs">{accountsStatus}</p>
          ) : null}
        </div>
      </Section>
    </>
  );
}
