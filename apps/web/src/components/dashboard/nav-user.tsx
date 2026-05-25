"use client";

import { signOut } from "@avenire/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avenire/ui/components/avatar";
import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import { DitherIdenticon } from "@avenire/ui/components/dither-identicon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { Input } from "@avenire/ui/components/input";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import {
  Check,
  CaretUpDown as ChevronsUpDown,
  SignOut as LogOut,
  Envelope as Mail,
  Plus,
  UserPlus,
} from "@phosphor-icons/react";
import { Building as Building2 } from "@phosphor-icons/react/Building";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { SensitiveText } from "@/components/shared/sensitive-text";
import { useHaptics } from "@/hooks/use-haptics";
import { usePrivacyMode } from "@/hooks/use-privacy-mode";
import type { WorkspaceSummary } from "./command-palette-model";
import {
  getSidebarInvitationsState,
  getSidebarWorkspaceListState,
} from "./dashboard-sidebar-workspaces-model";

interface WorkspaceInvitation {
  id: string;
  inviterEmail: string;
  inviterName: string | null;
  organizationId: string;
  organizationName: string;
}

function WorkspaceSwitchMenuSection({
  activeWorkspaceId,
  createWorkspaceTrigger,
  subtitle,
  switchWorkspaceEmptyMessage,
  onSwitchWorkspace,
  triggerHaptic,
  workspaces,
}: {
  activeWorkspaceId?: string | null;
  createWorkspaceTrigger: ReactNode;
  subtitle: string;
  switchWorkspaceEmptyMessage: string | null;
  onSwitchWorkspace?: (workspace: WorkspaceSummary) => void;
  triggerHaptic: () => void;
  workspaces: WorkspaceSummary[];
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Building2 className="size-4" />
        <div className="min-w-0 flex-1">
          <p className="truncate">Switch Workspace</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-64 border border-border/70 bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-0">
        {switchWorkspaceEmptyMessage ? (
          <DropdownMenuItem disabled>
            <Building2 className="size-4" />
            {switchWorkspaceEmptyMessage}
          </DropdownMenuItem>
        ) : (
          workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.workspaceId}
              onSelect={() => {
                void triggerHaptic();
                onSwitchWorkspace?.(workspace);
              }}
            >
              <Building2 className="size-4" />
              <span className="truncate">{workspace.name}</span>
              {workspace.workspaceId === activeWorkspaceId ? (
                <Check className="ml-auto size-4" />
              ) : null}
            </DropdownMenuItem>
          ))
        )}
        {createWorkspaceTrigger}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function WorkspaceInvitesMenuSection({
  emptyMessage,
  invitations,
  onAcceptInvitation,
  onDeclineInvitation,
  privacyMode,
  subtitle,
}: {
  emptyMessage: string | null;
  invitations: WorkspaceInvitation[];
  onAcceptInvitation?: (invitationId: string) => Promise<void> | void;
  onDeclineInvitation?: (invitationId: string) => Promise<void> | void;
  privacyMode: boolean;
  subtitle: string;
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <UserPlus className="size-4" />
        <div className="min-w-0 flex-1">
          <p>Workspace invites</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-72 border border-border/70 bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-0">
        {emptyMessage ? (
          <DropdownMenuItem disabled>
            <Mail className="size-4" />
            {emptyMessage}
          </DropdownMenuItem>
        ) : (
          invitations.map((invite) => (
            <div
              className="rounded-md border border-border/60 p-2"
              key={invite.id}
            >
              <p className="truncate font-medium text-xs">
                {invite.organizationName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                <SensitiveText
                  className="truncate"
                  privacyMode={privacyMode}
                  value={invite.inviterName ?? invite.inviterEmail}
                />
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    void onAcceptInvitation?.(invite.id);
                  }}
                  size="sm"
                  type="button"
                >
                  Accept
                </Button>
                <Button
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    void onDeclineInvitation?.(invite.id);
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Decline
                </Button>
              </div>
            </div>
          ))
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function NavUser({
  user,
  compact = false,
  workspaces = [],
  invitations = [],
  activeWorkspaceId,
  workspacesLoadFailed = false,
  workspacesLoading = false,
  workspacesErrorMessage = null,
  invitationsLoadFailed = false,
  invitationsLoading = false,
  invitationsErrorMessage = null,
  workspaceActionStatus = null,
  onSwitchWorkspace,
  onCreateWorkspace,
  onAcceptInvitation,
  onDeclineInvitation,
}: {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  compact?: boolean;
  workspaces?: WorkspaceSummary[];
  invitations?: WorkspaceInvitation[];
  activeWorkspaceId?: string | null;
  workspacesLoadFailed?: boolean;
  workspacesLoading?: boolean;
  workspacesErrorMessage?: string | null;
  invitationsLoadFailed?: boolean;
  invitationsLoading?: boolean;
  invitationsErrorMessage?: string | null;
  workspaceActionStatus?: string | null;
  onSwitchWorkspace?: (workspace: WorkspaceSummary) => void;
  onCreateWorkspace?: (name: string) => Promise<void> | void;
  onAcceptInvitation?: (invitationId: string) => Promise<void> | void;
  onDeclineInvitation?: (invitationId: string) => Promise<void> | void;
}) {
  const router = useRouter();
  const resolvedUser = user ?? {
    email: "signed-out@local",
    name: "Account",
  };
  const { isMobile, setOpenMobile } = useSidebar();
  const triggerHaptic = useHaptics();
  const avatarSeed = resolvedUser.name || resolvedUser.email || "user";
  const privacyMode = usePrivacyMode();
  const [avatarErrored, setAvatarErrored] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState<
    string | null
  >(null);

  const handleSignOut = async () => {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    setOpenMobile(false);
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      router.replace("/login");
      router.refresh();
      window.location.replace("/login");
    }
  };

  const avatarSrc = avatarErrored ? undefined : resolvedUser.avatar;

  const activeWorkspace = useMemo(
    () =>
      workspaces.find(
        (workspace) => workspace.workspaceId === activeWorkspaceId
      ) ?? null,
    [activeWorkspaceId, workspaces]
  );
  const activeWorkspaceLabel = activeWorkspace?.name ?? "Active workspace";
  const workspaceListState = getSidebarWorkspaceListState({
    activeWorkspaceLabel,
    errorMessage: workspacesErrorMessage,
    loadFailed: workspacesLoadFailed,
    loading: workspacesLoading,
    workspaceCount: workspaces.length,
  });
  const invitationsState = getSidebarInvitationsState({
    errorMessage: invitationsErrorMessage,
    invitationCount: invitations.length,
    loadFailed: invitationsLoadFailed,
    loading: invitationsLoading,
  });

  return (
    <Dialog onOpenChange={setCreateOpen} open={createOpen}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  className={cn(
                    "hit-area",
                    compact
                      ? "mx-auto size-8! justify-center rounded-full p-0! hover:bg-transparent data-[state=open]:bg-transparent"
                      : "h-[3.25rem]! gap-2.5 rounded-full! p-2! hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent/70 data-[state=open]:text-sidebar-accent-foreground"
                  )}
                  size={compact ? "default" : "lg"}
                />
              }
            >
              <Avatar
                className={cn(
                  "rounded-full after:border-0",
                  compact ? "size-8!" : "size-9!"
                )}
              >
                {avatarSrc ? (
                  <AvatarImage
                    alt={resolvedUser.name}
                    onError={() => {
                      setAvatarErrored(true);
                    }}
                    src={avatarSrc}
                  />
                ) : null}
                <AvatarFallback className="overflow-hidden rounded-full bg-transparent text-foreground">
                  <DitherIdenticon className="size-full!" seed={avatarSeed} />
                </AvatarFallback>
              </Avatar>
              {compact ? null : (
                <>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <SensitiveText
                      className="truncate font-medium"
                      privacyMode={privacyMode}
                      value={resolvedUser.name}
                    />
                    <SensitiveText
                      className="truncate text-xs"
                      privacyMode={privacyMode}
                      value={resolvedUser.email}
                    />
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg border border-border/70 bg-popover shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-0"
              side={isMobile ? "bottom" : "right"}
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <WorkspaceSwitchMenuSection
                  activeWorkspaceId={activeWorkspaceId}
                  createWorkspaceTrigger={
                    <DialogTrigger render={<DropdownMenuItem />}>
                      <Plus className="size-4" />
                      Create workspace
                    </DialogTrigger>
                  }
                  onSwitchWorkspace={onSwitchWorkspace}
                  subtitle={workspaceListState.subtitle}
                  switchWorkspaceEmptyMessage={workspaceListState.emptyMessage}
                  triggerHaptic={() => triggerHaptic("selection")}
                  workspaces={workspaces}
                />

                <WorkspaceInvitesMenuSection
                  emptyMessage={invitationsState.emptyMessage}
                  invitations={invitations}
                  onAcceptInvitation={onAcceptInvitation}
                  onDeclineInvitation={onDeclineInvitation}
                  privacyMode={privacyMode}
                  subtitle={invitationsState.subtitle}
                />
              </DropdownMenuGroup>

              <DropdownMenuSeparator />
              {workspaceActionStatus ? (
                <div className="px-2 pb-2 text-destructive text-xs">
                  {workspaceActionStatus}
                </div>
              ) : null}
              <DropdownMenuItem
                disabled={signingOut}
                onClick={() => {
                  void triggerHaptic("selection");
                  void handleSignOut();
                }}
                variant="destructive"
              >
                <LogOut />
                {signingOut ? "Signing out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Add a new workspace. You can switch between workspaces from your
            profile menu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor="workspace-name">
            Workspace name
          </label>
          <Input
            autoFocus
            id="workspace-name"
            onChange={(event) => {
              setWorkspaceName(event.target.value);
              if (createWorkspaceError) {
                setCreateWorkspaceError(null);
              }
            }}
            placeholder="Product Design"
            value={workspaceName}
          />
          {createWorkspaceError ? (
            <p className="text-destructive text-xs">{createWorkspaceError}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              setCreateOpen(false);
              setWorkspaceName("");
              setCreateWorkspaceError(null);
            }}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={creatingWorkspace || workspaceName.trim().length === 0}
            onClick={() => {
              if (!workspaceName.trim()) {
                return;
              }
              void (async () => {
                setCreatingWorkspace(true);
                try {
                  await onCreateWorkspace?.(workspaceName.trim());
                  setCreateOpen(false);
                  setWorkspaceName("");
                  setCreateWorkspaceError(null);
                } catch (error) {
                  setCreateWorkspaceError(
                    error instanceof Error
                      ? error.message
                      : "Unable to create workspace."
                  );
                } finally {
                  setCreatingWorkspace(false);
                }
              })();
            }}
            type="button"
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
