"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avenire/ui/components/avatar";
import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  CreditCard,
  Database,
  Key,
  Shield,
  SlidersHorizontal,
  User,
} from "@phosphor-icons/react";
import { Building as Building2 } from "@phosphor-icons/react/Building";
import type { ReactNode } from "react";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";
import { SensitiveText } from "../shared/sensitive-text";

export function SettingsPanelShell({
  runtime,
  children,
}: {
  runtime: SettingsPanelRuntime;
  children: ReactNode;
}) {
  const {
    currentPlanLabel,
    currentTab,
    displayAvatar,
    fallbackInitials,
    hasKeyboardDetected,
    mobileTabs,
    privacyMode,
    resolvedSessionUser,
    session,
    setTab,
  } = runtime;
  const headerUser = resolvedSessionUser ?? session?.user ?? null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background sm:rounded-xl md:flex-row">
      <aside className="hidden w-72 shrink-0 flex-col border-border/60 border-r bg-sidebar p-4 md:flex">
        <div className="mb-4">
          <h2 className="font-semibold text-xl">Settings</h2>
        </div>

        <div className="space-y-2">
          <p className="px-2 text-muted-foreground text-xs">Account</p>
          <Button
            className={[
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
              currentTab === "account"
                ? "bg-muted font-medium hover:bg-muted"
                : "hover:bg-muted/70",
            ].join(" ")}
            onClick={() => setTab("account")}
            variant="ghost"
          >
            <User className="h-4 w-4" />
            Account
          </Button>
          <Button
            className={[
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
              currentTab === "preferences"
                ? "bg-muted font-medium hover:bg-muted"
                : "hover:bg-muted/70",
            ].join(" ")}
            onClick={() => setTab("preferences")}
            variant="ghost"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Preferences
          </Button>
        </div>

        <div className="mt-5 space-y-2">
          <p className="px-2 text-muted-foreground text-xs">Workspace</p>
          <Button
            className={[
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
              currentTab === "workspace"
                ? "bg-muted font-medium hover:bg-muted"
                : "hover:bg-muted/70",
            ].join(" ")}
            onClick={() => setTab("workspace")}
            variant="ghost"
          >
            <Building2 className="h-4 w-4" />
            Workspace
          </Button>
          <Button
            className={[
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
              currentTab === "data"
                ? "bg-muted font-medium hover:bg-muted"
                : "hover:bg-muted/70",
            ].join(" ")}
            onClick={() => setTab("data")}
            variant="ghost"
          >
            <Database className="h-4 w-4" />
            Data
          </Button>
          <Button
            className={[
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
              currentTab === "billing"
                ? "bg-muted font-medium hover:bg-muted"
                : "hover:bg-muted/70",
            ].join(" ")}
            onClick={() => setTab("billing")}
            variant="ghost"
          >
            <CreditCard className="h-4 w-4" />
            Billing
          </Button>
          <Button
            className={[
              "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
              currentTab === "security"
                ? "bg-muted font-medium hover:bg-muted"
                : "hover:bg-muted/70",
            ].join(" ")}
            onClick={() => setTab("security")}
            variant="ghost"
          >
            <Shield className="h-4 w-4" />
            Security
          </Button>
          {hasKeyboardDetected ? (
            <Button
              className={[
                "h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm transition-colors",
                currentTab === "shortcuts"
                  ? "bg-muted font-medium hover:bg-muted"
                  : "hover:bg-muted/70",
              ].join(" ")}
              onClick={() => setTab("shortcuts")}
              variant="ghost"
            >
              <Key className="h-4 w-4" />
              Keyboard Shortcuts
            </Button>
          ) : null}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-border/60 border-b px-4 py-3 md:hidden">
          <Avatar className="h-9 w-9">
            <AvatarImage
              alt={headerUser?.name ?? "User"}
              src={displayAvatar || undefined}
            />
            <AvatarFallback>{fallbackInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">
              <SensitiveText
                className="max-w-full"
                privacyMode={privacyMode}
                value={headerUser?.name || "User"}
              />
            </p>
            <p className="truncate text-muted-foreground text-xs">
              <SensitiveText
                className="max-w-full"
                privacyMode={privacyMode}
                value={headerUser?.email}
              />
            </p>
          </div>
          <Badge className="ml-auto shrink-0 text-xs" variant="secondary">
            {currentPlanLabel}
          </Badge>
        </div>

        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-border/60 border-b px-4 py-3 md:hidden">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <Button
                className={[
                  "h-9 shrink-0 gap-1.5 rounded-full px-3 font-medium text-xs transition-colors",
                  currentTab === tab.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
                key={tab.key}
                onClick={() => setTab(tab.key)}
                type="button"
                variant="ghost"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 md:space-y-8 md:px-8 md:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
