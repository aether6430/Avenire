"use client";

import {
  authClient,
  linkSocial,
  listAccounts,
  revokeOtherSessions,
  unlinkAccount,
  updateUser,
  useSession,
} from "@avenire/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avenire/ui/components/avatar";
import { DitherIdenticon } from "@avenire/ui/components/dither-identicon";
import { Badge } from "@avenire/ui/components/badge";
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
import { Kbd, KbdGroup } from "@avenire/ui/components/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { Spinner } from "@avenire/ui/components/spinner";
import { Switch } from "@avenire/ui/components/switch";
import {
  Building as Building2,
  Camera,
  Check,
  CreditCard,
  Database,
  FileText,
  Folder,
  GithubLogo as Github,
  Globe,
  HardDrive,
  Key,
  Shield,
  SlidersHorizontal,
  Warning as TriangleAlert,
  LinkBreak as Unlink,
  User,
  Users,
} from "@phosphor-icons/react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import { DataImportsSection } from "@/components/settings/data-imports-section";
import { SensitiveText } from "@/components/shared/sensitive-text";
import { PetPreferencesFields } from "@/components/pets/pet-preferences-fields";
import {
  BILLING_PLANS,
  BILLING_SETTINGS_PATH,
  canUpgradePlan,
  formatInr,
  getYearlyDiscountPercent,
  type BillingPlanKey,
  type PaidBillingPlanKey,
} from "@/lib/billing-plans";
import {
  CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
  type ChatComposerSendMode,
  DEFAULT_CHAT_COMPOSER_SEND_MODE,
} from "@/lib/chat-composer-preferences";
import { type PetAccessory } from "@/lib/pet-preferences";
import {
  ensurePolarCustomer,
  startPolarCheckout,
} from "@/lib/polar-checkout-client";
import { PRIVACY_MODE_STORAGE_KEY } from "@/lib/privacy-mode";
import { getUploadErrorMessage } from "@/lib/upload";
import { useUploadThing } from "@/lib/uploadthing";
import {
  loadUserSettings,
  saveUserSettings,
  type UserSettingsPreferences,
} from "@/lib/user-settings-client";
import { cn } from "@/lib/utils";

interface WorkspaceSummary {
  logo: string | null;
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

interface WorkspaceMember {
  email: string | null;
  id: string | null;
  name: string | null;
  role: string;
  userId: string | null;
}

interface WorkspaceUsage {
  fileCount: number;
  folderCount: number;
  indexedFileCount: number;
  memberCount: number;
  pendingIngestionCount: number;
  totalSizeBytes: number;
}

interface AccountEntry {
  accountId?: string;
  id?: string;
  providerId?: string;
}

interface PasskeyEntry {
  createdAt?: string;
  deviceType?: string;
  id: string;
  name?: string | null;
}

interface MeterUsage {
  fourHourBalance: number;
  fourHourCapacity: number;
  overageBalance: number;
  overageCapacity: number;
  refillAt: string | null;
  totalBalance: number;
  totalCapacity: number;
}

interface BillingUsage {
  chat: MeterUsage;
  combined: {
    totalCapacity: number;
    totalBalance: number;
  };
  entitlements?: {
    features: Record<string, boolean>;
    responseSpeed: "standard" | "priority";
  };
  plan: BillingPlanKey;
  storage: {
    limitBytes: number;
    remainingBytes: number;
    usedBytes: number;
  };
}

interface PolarCustomerState {
  activeSubscriptions?: Array<{
    amount?: number;
    metadata?: Record<string, string | number | boolean | undefined>;
    productId?: string;
    status?: string;
  }>;
}

const tabs = [
  { key: "account", label: "Account", icon: User },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { key: "workspace", label: "Workspace", icon: Building2 },
  { key: "data", label: "Data", icon: Database },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "security", label: "Security", icon: Shield },
  {
    key: "shortcuts",
    label: "Keyboard Shortcuts",
    icon: Key,
    mobileHidden: true,
  },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const KEYBOARD_SHORTCUT_GROUPS = [
  {
    name: "General",
    items: [
      { label: "Command Palette", keys: ["Ctrl", "Shift", "K"] },
      { label: "Open Manage", keys: ["Ctrl", "K"] },
    ],
  },
  {
    name: "Workspace",
    items: [
      { label: "Toggle Sidebar", keys: ["Ctrl", "B"] },
      { label: "Open Model Picker", keys: ["Ctrl", "/"] },
      { label: "Show or hide pet", keys: ["Ctrl", "Shift", "Y"] },
    ],
  },
  {
    name: "Editing",
    items: [
      { label: "New Method", keys: ["Ctrl", "Shift", "O"] },
      { label: "Delete Current Method", keys: ["Ctrl", "Shift", "⌫"] },
    ],
  },
] as const;

const KEYBOARD_DETECTED_STORAGE_KEY = "avenire:keyboard-detected";

const PLAN_LABELS: Record<string, string> = {
  access: "Free Plan",
  core: "Core Plan",
  scholar: "Scholar Plan",
};

function planFromPolarCustomerState(
  state: PolarCustomerState | null | undefined
): BillingUsage["plan"] | null {
  const subscription = state?.activeSubscriptions?.find((candidate) => {
    const status = candidate.status?.toLowerCase();
    return status === "active" || status === "trialing";
  });

  if (!subscription) {
    return null;
  }

  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === "core" || metadataPlan === "scholar") {
    return metadataPlan;
  }

  return null;
}

function withBillingPlan(
  usage: BillingUsage,
  plan: BillingUsage["plan"]
): BillingUsage {
  if (usage.plan === plan) {
    return usage;
  }

  return { ...usage, plan };
}

async function loadProviderBillingPlan(): Promise<BillingUsage["plan"] | null> {
  await ensurePolarCustomer();
  const providerState = (await authClient.customer.state()) as {
    data?: PolarCustomerState | null;
  };

  return planFromPolarCustomerState(providerState.data);
}

const THEME_PREVIEW = {
  light: {
    outer: "#ffffff",
    inner: "#37352f",
  },
  dark: {
    outer: "#141414",
    inner: "rgba(255, 255, 255, 0.9)",
  },
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

function formatRefillAt(value: string | null) {
  if (!value) {
    return "No scheduled refill";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No scheduled refill";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SettingsPanel({
  initialWorkspaces,
  initialWorkspaceId,
  tabMode = "url",
  initialTab = "account",
}: {
  initialWorkspaces?: WorkspaceSummary[];
  initialWorkspaceId?: string;
  tabMode?: "url" | "local";
  initialTab?: TabKey;
}) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [localTab, setLocalTab] = useState<TabKey>(initialTab);
  const validTabSet = useMemo(
    () => new Set<TabKey>(tabs.map((tab) => tab.key)),
    []
  );
  const tabFromQuery = searchParams.get("tab");
  const currentTab =
    tabMode === "url" && tabFromQuery && validTabSet.has(tabFromQuery as TabKey)
      ? (tabFromQuery as TabKey)
      : localTab;

  // Profile state
  const [profileName, setProfileName] = useState(session?.user?.name ?? "");
  const [profileImage, setProfileImage] = useState(session?.user?.image ?? "");
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { startUpload: startAvatarUpload } = useUploadThing("imageUploader");
  const savedProfileRef = useRef({
    image: session?.user?.image ?? "",
    name: session?.user?.name ?? "",
  });

  // Accounts
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [accountsStatus, setAccountsStatus] = useState<string | null>(null);

  // Billing
  const [billingUsage, setBillingUsage] = useState<BillingUsage | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [preferencesStatus, setPreferencesStatus] = useState<string | null>(
    null
  );
  const [shortcutQuery, setShortcutQuery] = useState("");
  const [hasKeyboardDetected, setHasKeyboardDetected] = useState(false);
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [completedTasksAtTop, setCompletedTasksAtTop] = useState(true);
  const [petName, setPetName] = useState("Auri");
  const [petAccessory, setPetAccessory] = useState<PetAccessory>("none");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [chatComposerSendMode, setChatComposerSendMode] =
    useLocalStorage<ChatComposerSendMode>(
      CHAT_COMPOSER_SEND_MODE_STORAGE_KEY,
      DEFAULT_CHAT_COMPOSER_SEND_MODE
    );
  const [sessionsStatus, setSessionsStatus] = useState<string | null>(null);

  // Passkeys
  const [passkeys, setPasskeys] = useState<PasskeyEntry[]>([]);
  const [passkeysStatus, setPasskeysStatus] = useState<string | null>(null);

  // Workspaces
  const [workspaces, setWorkspaces] = useState(initialWorkspaces ?? []);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialWorkspaceId ?? initialWorkspaces?.[0]?.workspaceId ?? ""
  );
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>(
    []
  );
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsage | null>(
    null
  );
  const [workspaceUsageStatus, setWorkspaceUsageStatus] = useState<
    string | null
  >(null);
  const [workspaceEmail, setWorkspaceEmail] = useState("");
  const [workspaceStatus, setWorkspaceStatus] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);

  useEffect(() => {
    const storedKeyboardDetected =
      window.localStorage.getItem(KEYBOARD_DETECTED_STORAGE_KEY) === "true";
    const hasKeyboardApi = "keyboard" in navigator;

    if (storedKeyboardDetected || hasKeyboardApi) {
      setHasKeyboardDetected(true);
      return;
    }

    const detectKeyboard = (event: KeyboardEvent) => {
      if (event.isComposing || event.key === "Unidentified") {
        return;
      }
      setHasKeyboardDetected(true);
      window.localStorage.setItem(KEYBOARD_DETECTED_STORAGE_KEY, "true");
      window.removeEventListener("keydown", detectKeyboard);
    };

    window.addEventListener("keydown", detectKeyboard, { passive: true });
    return () => window.removeEventListener("keydown", detectKeyboard);
  }, []);
  const [workspaceDeleteConfirm, setWorkspaceDeleteConfirm] = useState("");
  const [workspaceIconDraft, setWorkspaceIconDraft] = useState("");
  const [workspaceIconStatus, setWorkspaceIconStatus] = useState<string | null>(
    null
  );
  const [workspaceIconUploading, setWorkspaceIconUploading] = useState(false);
  const workspaceIconInputRef = useRef<HTMLInputElement | null>(null);
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState("");
  const [dangerStatus, setDangerStatus] = useState<string | null>(null);
  const [sudoActive, setSudoActive] = useState(false);
  const [sudoCode, setSudoCode] = useState("");
  const [sudoStatus, setSudoStatus] = useState<string | null>(null);
  const [sudoDialogOpen, setSudoDialogOpen] = useState(false);
  const [sudoActionLabel, setSudoActionLabel] = useState("this action");
  const [sudoRequestingCode, setSudoRequestingCode] = useState(false);
  const [sudoVerifyingCode, setSudoVerifyingCode] = useState(false);
  const pendingSudoActionRef = useRef<null | (() => Promise<void>)>(null);
  const codeRequestedForSessionRef = useRef(false);
  const accountsLoadedRef = useRef(false);
  const preferencesLoadedRef = useRef(false);
  const billingLoadedRef = useRef(false);
  const securityLoadedRef = useRef(false);
  const workspaceLoadedRef = useRef(false);
  const workspaceUsageLoadedForRef = useRef<string>("");

  useEffect(() => {
    setProfileName(session?.user?.name ?? "");
    setProfileImage(session?.user?.image ?? "");
    savedProfileRef.current = {
      image: session?.user?.image ?? "",
      name: session?.user?.name ?? "",
    };
  }, [session?.user?.image, session?.user?.name]);

  useEffect(() => {
    setAvatarPreview(session?.user?.image ?? "");
  }, [session?.user?.image]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.workspaceId === activeWorkspaceId) ?? null,
    [activeWorkspaceId, workspaces]
  );
  const filteredShortcutGroups = useMemo(() => {
    const query = shortcutQuery.trim().toLowerCase();
    if (!query) {
      return KEYBOARD_SHORTCUT_GROUPS;
    }

    return KEYBOARD_SHORTCUT_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((shortcut) =>
        [shortcut.label, shortcut.keys.join(" "), group.name]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ),
    })).filter((group) => group.items.length > 0);
  }, [shortcutQuery]);
  const filteredShortcutCount = useMemo(
    () =>
      filteredShortcutGroups.reduce(
        (total, group) => total + group.items.length,
        0
      ),
    [filteredShortcutGroups]
  );

  useEffect(() => {
    setWorkspaceIconDraft(selectedWorkspace?.logo ?? "");
  }, [selectedWorkspace?.logo]);

  useEffect(() => {
    setWorkspaceIconStatus(null);
  }, [selectedWorkspace?.workspaceId]);

  const refreshAccounts = async () => {
    const result = await listAccounts();
    setAccounts(
      ((result as { data?: AccountEntry[] | null }).data ??
        []) as AccountEntry[]
    );
  };

  const refreshBillingUsage = async (showLoading = false) => {
    if (showLoading) {
      setBillingStatus("Loading usage...");
    }
    const response = await fetch("/api/billing/usage", { cache: "no-store" });
    if (!response.ok) {
      if (showLoading) {
        setBillingStatus("Unable to load billing usage.");
      }
      return;
    }
    const payload = (await response.json()) as { usage?: BillingUsage };
    let nextUsage = payload.usage ?? null;

    try {
      const providerPlan = await loadProviderBillingPlan();
      if (nextUsage && providerPlan) {
        nextUsage = withBillingPlan(nextUsage, providerPlan);
      }
    } catch (error) {
      console.warn("[settings] failed to load Polar customer state", error);
    }

    setBillingUsage(nextUsage);
    if (showLoading) {
      setBillingStatus(null);
    }
  };

  const refreshPasskeys = async () => {
    const response = await fetch("/api/auth/passkey/list-user-passkeys", {
      cache: "no-store",
    });
    if (!response.ok) {
      setPasskeys([]);
      return;
    }
    const payload = (await response.json()) as PasskeyEntry[];
    setPasskeys(Array.isArray(payload) ? payload : []);
  };

  const refreshUserSettings = async () => {
    setPreferencesStatus("Loading preferences...");
    try {
      const settings = await loadUserSettings();
      setEmailReceipts(settings.emailReceipts);
      setCompletedTasksAtTop(settings.completedTasksAtTop);
      setPetName(settings.petName);
      setPetAccessory(settings.petAccessory);
      setPreferencesStatus(null);
    } catch {
      setPreferencesStatus("Unable to load preferences.");
    }
  };

  const persistUserSettings = async (
    updates: Partial<UserSettingsPreferences>,
    rollback: () => void
  ) => {
    try {
      setPreferencesStatus("Saving preferences...");
      const settings = await saveUserSettings(updates);
      setEmailReceipts(settings.emailReceipts);
      setCompletedTasksAtTop(settings.completedTasksAtTop);
      setPetName(settings.petName);
      setPetAccessory(settings.petAccessory);
      setPreferencesStatus("Preferences saved.");
    } catch {
      rollback();
      setPreferencesStatus("Unable to save preferences.");
    }
  };

  const refreshMembers = async (workspaceId: string) => {
    const response = await fetch(
      `/api/workspaces/${workspaceId}/share/members`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      setWorkspaceMembers([]);
      return;
    }
    const payload = (await response.json()) as { members?: WorkspaceMember[] };
    setWorkspaceMembers(payload.members ?? []);
  };

  const refreshWorkspaceUsage = async (
    workspaceId: string,
    showLoading = false
  ) => {
    if (showLoading) {
      setWorkspaceUsageStatus("Loading workspace stats...");
    }

    const response = await fetch(`/api/workspaces/${workspaceId}/usage`, {
      cache: "no-store",
    });

    if (!response.ok) {
      setWorkspaceUsage(null);
      setWorkspaceUsageStatus("Unable to load workspace stats.");
      return;
    }

    const payload = (await response.json()) as { usage?: WorkspaceUsage };
    setWorkspaceUsage(payload.usage ?? null);
    if (showLoading) {
      setWorkspaceUsageStatus(null);
    }
  };

  const refreshWorkspaces = async () => {
    const response = await fetch("/api/workspaces/list", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as {
      workspaces?: WorkspaceSummary[];
    };
    setWorkspaces(payload.workspaces ?? []);
    if (!activeWorkspaceId && payload.workspaces?.[0]) {
      setActiveWorkspaceId(payload.workspaces[0].workspaceId);
    }
  };

  const refreshSudoStatus = async () => {
    const response = await fetch("/api/security/sudo", { cache: "no-store" });
    if (!response.ok) {
      setSudoActive(false);
      setSudoStatus(null);
      return;
    }
    const payload = (await response.json()) as { active?: boolean };
    setSudoActive(Boolean(payload.active));
    if (payload.active) {
      setSudoStatus("Sudo mode is active for this session.");
    } else {
      setSudoStatus(null);
    }
  };

  const saveProfile = async (
    nextImage?: string,
    options?: { quiet?: boolean }
  ) => {
    setProfileStatus("Saving...");
    setIsSavingProfile(true);
    const nextName = profileName.trim();
    const resolvedImage = (nextImage ?? profileImage).trim();
    try {
      const result = await updateUser({
        name: nextName || undefined,
        image: resolvedImage || undefined,
      });
      if (!result.error) {
        savedProfileRef.current = {
          image: resolvedImage,
          name: nextName,
        };
      }
      setProfileStatus(
        result.error
          ? "Unable to update profile."
          : options?.quiet
            ? "Saved."
            : "Profile updated."
      );
      return !result.error;
    } catch {
      setProfileStatus("Unable to update profile.");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    const nextName = profileName.trim();
    const nextImage = profileImage.trim();
    if (
      nextName === savedProfileRef.current.name &&
      nextImage === savedProfileRef.current.image
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveProfile(undefined, { quiet: true });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [profileImage, profileName]);

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setAvatarUploading(true);
    setProfileStatus("Uploading avatar...");

    try {
      const uploaded = ((await startAvatarUpload([file])) ?? [])[0] as
        | { ufsUrl?: string | null; url?: string | null }
        | undefined;
      const uploadedUrl = uploaded?.ufsUrl ?? uploaded?.url ?? null;

      if (!uploadedUrl) {
        setProfileStatus("Unable to upload avatar.");
        return;
      }

      setProfileImage(uploadedUrl);
      setAvatarPreview(uploadedUrl);

      const saved = await saveProfile(uploadedUrl);
      if (saved) {
        setProfileStatus("Avatar uploaded and saved.");
      }
    } catch (error) {
      setProfileStatus(getUploadErrorMessage(error));
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveWorkspaceIcon = async (nextLogo?: string | null) => {
    if (!selectedWorkspace) {
      return false;
    }

    setWorkspaceIconStatus("Saving workspace icon...");
    const response = await fetch(
      `/api/workspaces/${selectedWorkspace.workspaceId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logo: nextLogo ?? (workspaceIconDraft.trim() || null),
        }),
      }
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setWorkspaceIconStatus(
        payload.error ?? "Unable to update workspace icon."
      );
      return false;
    }

    setWorkspaceIconStatus("Workspace icon updated.");
    await refreshWorkspaces();
    return true;
  };

  const handleWorkspaceIconFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!(file && selectedWorkspace)) {
      return;
    }

    setWorkspaceIconUploading(true);
    setWorkspaceIconStatus("Uploading workspace icon...");

    try {
      const uploaded = ((await startAvatarUpload([file])) ?? [])[0] as
        | { ufsUrl?: string | null; url?: string | null }
        | undefined;
      const uploadedUrl = uploaded?.ufsUrl ?? uploaded?.url ?? null;

      if (!uploadedUrl) {
        setWorkspaceIconStatus("Unable to upload workspace icon.");
        return;
      }

      setWorkspaceIconDraft(uploadedUrl);
      await saveWorkspaceIcon(uploadedUrl);
    } catch (error) {
      setWorkspaceIconStatus(getUploadErrorMessage(error));
    } finally {
      setWorkspaceIconUploading(false);
    }
  };

  const requestSudoForAction = (
    actionLabel: string,
    action: () => Promise<void>
  ) => {
    pendingSudoActionRef.current = action;
    setSudoActionLabel(actionLabel);
    setSudoCode("");
    setSudoStatus(null);
    setSudoDialogOpen(true);
  };

  const requestSudoCode = async () => {
    setSudoRequestingCode(true);
    setSudoStatus("Sending verification code...");

    try {
      const response = await fetch("/api/security/sudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setSudoStatus(
        response.ok
          ? "Verification code sent to your email."
          : (payload.error ?? "Unable to send code.")
      );
    } finally {
      setSudoRequestingCode(false);
    }
  };

  const verifySudoCodeAndContinue = async () => {
    setSudoVerifyingCode(true);
    setSudoStatus("Verifying code...");

    try {
      const response = await fetch("/api/security/sudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: sudoCode.trim() }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setSudoActive(false);
        setSudoStatus(payload.error ?? "Invalid or expired code.");
        return;
      }

      setSudoActive(true);
      setSudoCode("");
      setSudoStatus("Sudo mode is active for 12 hours.");

      const pendingAction = pendingSudoActionRef.current;
      pendingSudoActionRef.current = null;
      codeRequestedForSessionRef.current = false;
      setSudoDialogOpen(false);

      if (pendingAction) {
        await pendingAction();
      }
    } finally {
      setSudoVerifyingCode(false);
    }
  };

  useEffect(() => {
    if (currentTab !== "account" || accountsLoadedRef.current) {
      return;
    }
    accountsLoadedRef.current = true;
    refreshAccounts().catch(() => undefined);
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== "preferences" || preferencesLoadedRef.current) {
      return;
    }
    preferencesLoadedRef.current = true;
    refreshUserSettings().catch(() => undefined);
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== "billing" || billingLoadedRef.current) {
      return;
    }
    billingLoadedRef.current = true;
    refreshBillingUsage(true).catch(() => undefined);
    refreshUserSettings().catch(() => undefined);
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== "billing" || !billingLoadedRef.current) {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshBillingUsage(false).catch(() => undefined);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== "security" || securityLoadedRef.current) {
      return;
    }
    securityLoadedRef.current = true;
    refreshPasskeys().catch(() => undefined);
    refreshSudoStatus().catch(() => undefined);
  }, [currentTab]);

  useEffect(() => {
    if (currentTab !== "workspace") {
      return;
    }

    if (!workspaceLoadedRef.current) {
      workspaceLoadedRef.current = true;
      if (workspaces.length === 0) {
        refreshWorkspaces().catch(() => undefined);
      }
      refreshSudoStatus().catch(() => undefined);
    }

    if (
      activeWorkspaceId &&
      workspaceUsageLoadedForRef.current !== activeWorkspaceId
    ) {
      workspaceUsageLoadedForRef.current = activeWorkspaceId;
      refreshMembers(activeWorkspaceId).catch(() => undefined);
      refreshWorkspaceUsage(activeWorkspaceId, true).catch(() => undefined);
      refreshSudoStatus().catch(() => undefined);
    }
  }, [activeWorkspaceId, currentTab, workspaces.length]);

  useEffect(() => {
    const stored = window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY);
    setPrivacyMode(stored === "1");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      PRIVACY_MODE_STORAGE_KEY,
      privacyMode ? "1" : "0"
    );
  }, [privacyMode]);

  useEffect(() => {
    if (sudoDialogOpen && !sudoActive && !codeRequestedForSessionRef.current) {
      codeRequestedForSessionRef.current = true;
      void requestSudoCode();
    }
  }, [sudoActive, sudoDialogOpen]);

  const setTab = (tab: TabKey) => {
    if (tabMode === "local") {
      setLocalTab(tab);
      return;
    }
    router.replace(`/workspace?overlay=settings&settingsTab=${tab}` as Route);
  };

  useEffect(() => {
    if (currentTab === "shortcuts" && !hasKeyboardDetected) {
      setTab("account");
    }
  }, [currentTab, hasKeyboardDetected]);

  const visibleTabs = tabs.filter(
    (tab) => tab.key !== "shortcuts" || hasKeyboardDetected
  );
  const mobileTabs = visibleTabs.filter(
    (tab) => !("mobileHidden" in tab && tab.mobileHidden)
  );
  const currentPlanLabel = billingUsage
    ? (PLAN_LABELS[billingUsage.plan] ?? "Free Plan")
    : "Loading plan";
  const billingMeters = billingUsage
    ? [
        {
          kind: "credits" as const,
          label: "Apollo credits",
          remaining: billingUsage.chat.totalBalance,
          total: billingUsage.chat.totalCapacity,
          refillAt: billingUsage.chat.refillAt,
        },
        {
          kind: "storage" as const,
          label: "Storage",
          remaining: billingUsage.storage.remainingBytes,
          total: billingUsage.storage.limitBytes,
          used: billingUsage.storage.usedBytes,
        },
      ]
    : [];
  const currentUserEmail = session?.user?.email?.toLowerCase() ?? null;
  const selectedWorkspaceInitial = (
    selectedWorkspace?.name?.trim().charAt(0) || "A"
  ).toUpperCase();
  const selectedWorkspaceMemberCount =
    workspaceUsage?.memberCount ?? workspaceMembers.length;

  const displayAvatar = avatarPreview || profileImage;
  const avatarSeed =
    profileName || session?.user?.name || session?.user?.email || "user";

  const handleManageBilling = async () => {
    setBillingStatus("Opening billing portal...");
    try {
      await ensurePolarCustomer();
      await authClient.customer.portal();
      return;
    } catch (error) {
      console.error(
        "[settings] failed to open Better Auth Polar portal",
        error
      );
    }

    const response = await fetch("/api/billing/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnPath: BILLING_SETTINGS_PATH }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      url?: string;
    };

    if (!(response.ok && payload.url)) {
      setBillingStatus(payload.error ?? "Unable to open billing portal.");
      return;
    }

    window.location.href = payload.url;
  };

  const openCheckout = (plan: PaidBillingPlanKey) => {
    setBillingStatus("Opening checkout...");
    void startPolarCheckout(plan, "monthly").catch((error: unknown) => {
      console.error("[settings] failed to start Better Auth checkout", error);
      setBillingStatus("Unable to open checkout.");
    });
  };

  const runDeleteAccount = async () => {
    setDangerStatus("Deleting account...");
    const response = await fetch("/api/account", { method: "DELETE" });

    if (response.status === 403) {
      setSudoActive(false);
      setDangerStatus("Verification required.");
      requestSudoForAction("delete your account", runDeleteAccount);
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setDangerStatus(payload.error ?? "Unable to delete account.");
      return;
    }

    window.location.href = "/login";
  };

  const runDeleteWorkspace = async () => {
    if (!selectedWorkspace) {
      return;
    }

    setWorkspaceStatus("Deleting workspace...");
    const response = await fetch(
      `/api/workspaces/${selectedWorkspace.workspaceId}`,
      {
        method: "DELETE",
      }
    );

    if (response.status === 403) {
      setSudoActive(false);
      setWorkspaceStatus("Verification required.");
      requestSudoForAction(
        `delete ${selectedWorkspace.name}`,
        runDeleteWorkspace
      );
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setWorkspaceStatus(payload.error ?? "Unable to delete workspace.");
      return;
    }

    const payload = (await response.json()) as {
      workspaces?: WorkspaceSummary[];
    };
    const nextWorkspaces = payload.workspaces ?? [];
    setWorkspaces(nextWorkspaces);
    setWorkspaceDeleteConfirm("");
    if (nextWorkspaces.length > 0) {
      setActiveWorkspaceId(nextWorkspaces[0].workspaceId);
    }
    setWorkspaceStatus("Workspace deleted.");
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background sm:rounded-xl md:flex-row">
      {/* ─── Left Settings Navigation ─────────────────────────────── */}
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

      {/* ─── Right Content Area ───────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Mobile: compact profile header */}
        <div className="flex items-center gap-3 border-border/60 border-b px-4 py-3 md:hidden">
          <Avatar className="h-9 w-9">
            {displayAvatar ? (
              <AvatarImage alt={profileName} src={displayAvatar} />
            ) : null}
            <AvatarFallback className="overflow-hidden bg-muted text-foreground">
              <DitherIdenticon className="size-full" seed={avatarSeed} />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">
              <SensitiveText
                className="max-w-full"
                privacyMode={privacyMode}
                value={session?.user?.name || "User"}
              />
            </p>
            <p className="truncate text-muted-foreground text-xs">
              <SensitiveText
                className="max-w-full"
                privacyMode={privacyMode}
                value={session?.user?.email}
              />
            </p>
          </div>
          <Badge className="ml-auto shrink-0 text-xs" variant="secondary">
            {currentPlanLabel}
          </Badge>
        </div>

        {/* Tab nav */}
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-border/60 border-b px-4 py-3 md:hidden">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                className={[
                  "h-9 shrink-0 gap-1.5 rounded-lg px-3 font-medium text-xs transition-colors",
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
                <span>
                  {tab.label.replace("Keyboard Shortcuts", "Shortcuts")}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 md:space-y-8 md:px-8 md:py-6">
          {/* ── Account Tab ── */}
          {currentTab === "account" ? (
            <>
              <Section description="" title="Profile">
                <div className="max-w-md space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="Upload profile photo"
                      className="group/avatar relative size-16 shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      disabled={avatarUploading}
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      <Avatar className="size-16 rounded-xl">
                        {displayAvatar ? (
                          <AvatarImage alt={profileName} src={displayAvatar} />
                        ) : null}
                        <AvatarFallback className="overflow-hidden rounded-xl bg-muted text-foreground">
                          <DitherIdenticon
                            className="size-full"
                            seed={avatarSeed}
                          />
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-md border border-border/70 bg-background/95 text-foreground shadow-sm transition-colors group-hover/avatar:bg-secondary">
                        {avatarUploading ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <Camera className="size-3.5" />
                        )}
                      </span>
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                      <label className="font-medium text-muted-foreground text-xs">
                        Display Name
                      </label>
                      <Input
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Your name"
                        value={profileName}
                      />
                    </div>
                  </div>
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    ref={fileInputRef}
                    type="file"
                  />
                  {profileStatus ? (
                    <p className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                      {isSavingProfile ? <Spinner className="size-3" /> : null}
                      {profileStatus}
                    </p>
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
                        void linkSocial({ provider: "google" });
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
                        void linkSocial({ provider: "github" });
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
                    {accounts.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No linked accounts yet.
                      </p>
                    ) : (
                      accounts.map((account) => (
                        <div
                          className="flex items-center justify-between px-0 py-1.5"
                          key={
                            account.id ??
                            `${account.providerId}-${account.accountId}`
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
                              const providerId = account.providerId;
                              if (!providerId) {
                                return;
                              }
                              void (async () => {
                                const result = await unlinkAccount({
                                  accountId: account.accountId ?? "",
                                  providerId,
                                });
                                setAccountsStatus(
                                  result.error
                                    ? "Unable to unlink account."
                                    : "Account unlinked."
                                );
                                await refreshAccounts();
                              })();
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
                    <p className="text-muted-foreground text-xs">
                      {accountsStatus}
                    </p>
                  ) : null}
                </div>
              </Section>
            </>
          ) : null}

          {/* ── Billing Tab ── */}
          {currentTab === "billing" ? (
            <>
              <Section description="" title="Current Plan">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                    <p className="text-muted-foreground text-xs">Plan</p>
                    <p className="mt-1 font-semibold text-base">
                      {currentPlanLabel}
                    </p>
                  </div>
                  {billingMeters.map((meter) => (
                    <div
                      className="rounded-xl border border-border/60 bg-background/60 p-4"
                      key={meter.label}
                    >
                      <p className="text-muted-foreground text-xs">
                        {meter.label}
                      </p>
                      <p className="mt-1 font-semibold text-base">
                        {meter.kind === "storage"
                          ? formatBytes(meter.used)
                          : formatCredits(meter.remaining)}
                        <span className="font-normal text-muted-foreground text-xs">
                          {" "}
                          /{" "}
                          {meter.kind === "storage"
                            ? formatBytes(meter.total)
                            : formatCredits(meter.total)}
                        </span>
                      </p>
                      <p className="mt-1 text-muted-foreground text-xs">
                        {meter.kind === "storage"
                          ? `${formatBytes(meter.remaining)} available`
                          : `Refills ${formatRefillAt(meter.refillAt)}`}
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
                    canUpgrade={false}
                    current={billingUsage?.plan === "access"}
                    features={BILLING_PLANS.access.features}
                    name={BILLING_PLANS.access.label}
                    onUpgrade={null}
                    price="Free"
                  />
                  <PlanCard
                    canUpgrade={canUpgradePlan(billingUsage?.plan, "core")}
                    current={billingUsage?.plan === "core"}
                    features={BILLING_PLANS.core.features}
                    name={BILLING_PLANS.core.label}
                    onUpgrade={() => openCheckout("core")}
                    popular
                    price={`${formatInr(BILLING_PLANS.core.monthly)} / mo`}
                    yearlyPrice={`${formatInr(BILLING_PLANS.core.yearly)} / yr`}
                  />
                  <PlanCard
                    canUpgrade={canUpgradePlan(billingUsage?.plan, "scholar")}
                    current={billingUsage?.plan === "scholar"}
                    features={BILLING_PLANS.scholar.features}
                    name={BILLING_PLANS.scholar.label}
                    onUpgrade={() => openCheckout("scholar")}
                    price={`${formatInr(BILLING_PLANS.scholar.monthly)} / mo`}
                    yearlyPrice={`${formatInr(BILLING_PLANS.scholar.yearly)} / yr`}
                  />
                </div>
              </Section>

              <Divider />

              <Section description="" title="Billing Preferences">
                <div className="space-y-1">
                  <ToggleRow
                    checked={emailReceipts}
                    description="Send receipts to your account email when a payment succeeds."
                    label="Email me receipts"
                    onCheckedChange={(nextValue) => {
                      const previous = emailReceipts;
                      setEmailReceipts(nextValue);
                      void persistUserSettings(
                        { emailReceipts: nextValue },
                        () => setEmailReceipts(previous)
                      );
                    }}
                  />
                  {preferencesStatus ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
                      {preferencesStatus.startsWith("Loading") ? (
                        <Spinner className="size-3.5" />
                      ) : null}
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
                  Manage Billing & Invoices
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
          ) : null}

          {/* ── Security Tab ── */}
          {currentTab === "security" ? (
            <>
              <Section description="" title="Sensitive Actions">
                <div className="max-w-md space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-sm">Sudo verification</p>
                    <Badge variant={sudoActive ? "default" : "secondary"}>
                      {sudoActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <Button
                    disabled={sudoActive}
                    onClick={() => {
                      requestSudoForAction(
                        "verify this session",
                        async () => {}
                      );
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {sudoActive ? "Verification Active" : "Verify Now"}
                  </Button>
                  {sudoStatus ? (
                    <p className="text-muted-foreground text-xs">
                      {sudoStatus}
                    </p>
                  ) : null}
                </div>
              </Section>

              <Divider />

              <Section description="" title="Passkeys">
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      void (async () => {
                        setPasskeysStatus("Adding passkey...");
                        const addPasskey = (authClient as any)?.passkey
                          ?.addPasskey as
                          | ((opts?: {
                              name?: string;
                            }) => Promise<{ error: unknown }>)
                          | undefined;
                        if (!addPasskey) {
                          setPasskeysStatus("Passkey client is unavailable.");
                          return;
                        }
                        const result = await addPasskey({
                          name: "Avenire Passkey",
                        });
                        setPasskeysStatus(
                          result?.error
                            ? "Unable to add passkey."
                            : "Passkey added."
                        );
                        await refreshPasskeys();
                      })();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Add Passkey
                  </Button>
                  <div className="space-y-2">
                    {passkeys.length === 0 ? (
                      <p className="text-muted-foreground text-xs">
                        No passkeys registered.
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
                              void (async () => {
                                const response = await fetch(
                                  "/api/auth/passkey/delete-passkey",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ id: passkey.id }),
                                  }
                                );
                                setPasskeysStatus(
                                  response.ok
                                    ? "Passkey removed."
                                    : "Unable to remove passkey."
                                );
                                await refreshPasskeys();
                              })();
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
                    <p className="text-muted-foreground text-xs">
                      {passkeysStatus}
                    </p>
                  ) : null}
                </div>
              </Section>

              <Divider />

              <Section description="" title="Active Sessions">
                <Button
                  onClick={() => {
                    void (async () => {
                      setSessionsStatus("Signing out other devices...");
                      const result = await revokeOtherSessions();
                      setSessionsStatus(
                        result.error
                          ? "Unable to sign out other devices."
                          : "Signed out from other devices."
                      );
                    })();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Sign Out Other Devices
                </Button>
                {sessionsStatus ? (
                  <p className="text-muted-foreground text-xs">
                    {sessionsStatus}
                  </p>
                ) : null}
              </Section>

              <Divider />

              <Section description="" title="Danger Zone">
                <div className="max-w-md space-y-3">
                  <div className="flex items-start gap-2 text-red-600">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs">
                      Type{" "}
                      <span className="font-semibold">DELETE MY ACCOUNT</span>.
                      If needed, we will prompt for verification after you click
                      delete.
                    </p>
                  </div>
                  <Input
                    onChange={(e) => setAccountDeleteConfirm(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    value={accountDeleteConfirm}
                  />
                  <Button
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={
                      accountDeleteConfirm.trim() !== "DELETE MY ACCOUNT"
                    }
                    onClick={() => {
                      if (!sudoActive) {
                        requestSudoForAction(
                          "delete your account",
                          runDeleteAccount
                        );
                        return;
                      }
                      void runDeleteAccount();
                    }}
                    size="sm"
                    type="button"
                  >
                    Delete Account
                  </Button>
                </div>
                {dangerStatus ? (
                  <p className="text-muted-foreground text-xs">
                    {dangerStatus}
                  </p>
                ) : null}
              </Section>
            </>
          ) : null}

          {/* ── Preferences Tab ── */}
          {currentTab === "preferences" ? (
            <>
              <Section
                description="Control your account defaults and behavior."
                title="Preferences"
              >
                <div className="space-y-1">
                  <ToggleRow
                    checked={emailReceipts}
                    description="Send receipts to your account email when a payment succeeds."
                    label="Email me receipts"
                    onCheckedChange={(nextValue) => {
                      const previous = emailReceipts;
                      setEmailReceipts(nextValue);
                      void persistUserSettings(
                        { emailReceipts: nextValue },
                        () => setEmailReceipts(previous)
                      );
                    }}
                  />
                  <ToggleRow
                    checked={privacyMode}
                    description="Blur personal details in settings until you click to reveal them."
                    label="Privacy mode"
                    onCheckedChange={(nextValue) => {
                      setPrivacyMode(nextValue);
                    }}
                  />
                  <div className="flex flex-col gap-3 px-0 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Completed tasks</p>
                      <p className="text-muted-foreground text-xs">
                        Choose whether completed tasks stay at the top or drop
                        to the bottom in task lists.
                      </p>
                    </div>
                    <Select
                      onValueChange={(value) => {
                        const nextValue = value === "top";
                        const previous = completedTasksAtTop;
                        setCompletedTasksAtTop(nextValue);
                        void persistUserSettings(
                          { completedTasksAtTop: nextValue },
                          () => setCompletedTasksAtTop(previous)
                        );
                      }}
                      value={completedTasksAtTop ? "top" : "bottom"}
                    >
                      <SelectTrigger className="w-full sm:w-[12rem]">
                        <SelectValue placeholder="Top" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-3 px-0 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">Chat send shortcut</p>
                      <p className="text-muted-foreground text-xs">
                        Enter can send immediately, or you can require
                        Ctrl/Cmd+Enter. Shift+Enter always inserts a new line.
                      </p>
                    </div>
                    <Select
                      onValueChange={(value) => {
                        setChatComposerSendMode(
                          value === "mod-enter" ? "mod-enter" : "enter"
                        );
                      }}
                      value={chatComposerSendMode}
                    >
                      <SelectTrigger className="w-full sm:w-[12rem]">
                        <SelectValue placeholder="Enter to send" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enter">Enter to send</SelectItem>
                        <SelectItem value="mod-enter">
                          Ctrl/Cmd+Enter
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {preferencesStatus ? (
                    <p className="mt-2 inline-flex items-center gap-2 text-muted-foreground text-xs">
                      {preferencesStatus.startsWith("Loading") ? (
                        <Spinner className="size-3.5" />
                      ) : null}
                      {preferencesStatus}
                    </p>
                  ) : null}
                </div>
              </Section>

              <Divider />

              <Section
                description="Name Auri and choose an accessory for workspace surfaces."
                title="Personalize AI"
              >
                <div className="space-y-5">
                  <PetPreferencesFields
                    accessory={petAccessory}
                    accessoryDescription="Choose the accessory Auri should wear. This is saved to your account."
                    name={petName}
                    nameDescription="Give Auri a name that appears in chat and workspace surfaces."
                    namePlaceholder="Enter a name"
                    onAccessoryChange={(value) => {
                      const previous = petAccessory;
                      setPetAccessory(value);
                      void persistUserSettings({ petAccessory: value }, () =>
                        setPetAccessory(previous)
                      );
                    }}
                    onNameBlur={() => {
                      const nextValue = petName.trim() || "Auri";
                      const previous = petName;
                      setPetName(nextValue);
                      void persistUserSettings({ petName: nextValue }, () =>
                        setPetName(previous)
                      );
                    }}
                    onNameChange={setPetName}
                  />
                </div>
              </Section>

              <Divider />

              <Section
                description="Select a light or dark theme for your workspace."
                title="Appearance"
              >
                <div className="grid max-w-md grid-cols-3 gap-3">
                  <button
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors hover:bg-muted/50",
                      theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border/60"
                    )}
                    onClick={() => setTheme("light")}
                    type="button"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: THEME_PREVIEW.light.outer }}
                    >
                      <div
                        className="h-5 w-5 rounded-full shadow-sm"
                        style={{ backgroundColor: THEME_PREVIEW.light.inner }}
                      />
                    </div>
                    <span className="font-medium">Light</span>
                  </button>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors hover:bg-muted/50",
                      theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border/60"
                    )}
                    onClick={() => setTheme("dark")}
                    type="button"
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: THEME_PREVIEW.dark.outer }}
                    >
                      <div
                        className="h-5 w-5 rounded-full shadow-sm"
                        style={{ backgroundColor: THEME_PREVIEW.dark.inner }}
                      />
                    </div>
                    <span className="font-medium">Dark</span>
                  </button>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-sm transition-colors hover:bg-muted/50",
                      theme === "system"
                        ? "border-primary bg-primary/5"
                        : "border-border/60"
                    )}
                    onClick={() => setTheme("system")}
                    type="button"
                  >
                    <div className="flex h-10 w-10 overflow-hidden rounded-full">
                      <div
                        className="h-full w-1/2"
                        style={{ backgroundColor: THEME_PREVIEW.light.outer }}
                      />
                      <div
                        className="h-full w-1/2"
                        style={{ backgroundColor: THEME_PREVIEW.dark.outer }}
                      />
                    </div>
                    <span className="font-medium">System</span>
                  </button>
                </div>
              </Section>
            </>
          ) : null}

          {/* ── Workspace Tab ── */}
          {currentTab === "workspace" ? (
            <>
              <Section description="" title="Current workspace">
                <div className="space-y-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <button
                        aria-label="Upload workspace icon"
                        className="group/workspace-icon relative size-14 shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                        disabled={!selectedWorkspace || workspaceIconUploading}
                        onClick={() => workspaceIconInputRef.current?.click()}
                        type="button"
                      >
                        <Avatar className="size-14 rounded-2xl">
                          <AvatarImage
                            alt={selectedWorkspace?.name ?? "Workspace icon"}
                            src={
                              workspaceIconDraft ||
                              selectedWorkspace?.logo ||
                              ""
                            }
                          />
                          <AvatarFallback className="rounded-2xl bg-muted font-semibold text-foreground text-lg">
                            {selectedWorkspaceInitial}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-md border border-border/70 bg-background/95 text-foreground shadow-sm transition-colors group-hover/workspace-icon:bg-secondary">
                          {workspaceIconUploading ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            <Camera className="size-3.5" />
                          )}
                        </span>
                      </button>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-2xl leading-none">
                          {selectedWorkspace?.name ?? "Workspace"}
                        </h3>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <input
                        accept="image/*"
                        className="hidden"
                        onChange={handleWorkspaceIconFileChange}
                        ref={workspaceIconInputRef}
                        type="file"
                      />
                      {workspaceIconDraft || selectedWorkspace?.logo ? (
                        <Button
                          disabled={
                            !selectedWorkspace || workspaceIconUploading
                          }
                          onClick={() => {
                            setWorkspaceIconDraft("");
                            void saveWorkspaceIcon(null);
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Remove icon
                        </Button>
                      ) : null}
                      {workspaceIconStatus ? (
                        <p className="text-muted-foreground text-xs">
                          {workspaceIconStatus}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">Workspace stats</p>
                      {workspaceUsageStatus ? (
                        <p className="inline-flex items-center gap-2 text-muted-foreground text-xs">
                          {workspaceUsageStatus?.startsWith("Loading") ? (
                            <Spinner className="size-3.5" />
                          ) : null}
                          {workspaceUsageStatus}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <UsageStatCard
                        icon={HardDrive}
                        label="Storage Used"
                        value={
                          workspaceUsage ? (
                            formatBytes(workspaceUsage.totalSizeBytes)
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Spinner className="size-4" />
                              Loading...
                            </span>
                          )
                        }
                      />
                      <UsageStatCard
                        icon={FileText}
                        label="Files"
                        value={
                          workspaceUsage ? (
                            workspaceUsage.fileCount.toLocaleString()
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Spinner className="size-4" />
                              Loading...
                            </span>
                          )
                        }
                      />
                      <UsageStatCard
                        icon={Folder}
                        label="Folders"
                        value={
                          workspaceUsage ? (
                            workspaceUsage.folderCount.toLocaleString()
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Spinner className="size-4" />
                              Loading...
                            </span>
                          )
                        }
                      />
                      <UsageStatCard
                        icon={Users}
                        label="Indexed"
                        value={
                          workspaceUsage ? (
                            workspaceUsage.indexedFileCount.toLocaleString()
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <Spinner className="size-4" />
                              Loading...
                            </span>
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-sm">Members</p>
                      <Badge
                        className="rounded-full px-3 py-1 text-xs"
                        variant="outline"
                      >
                        {selectedWorkspace
                          ? `${selectedWorkspaceMemberCount} total`
                          : "0 members"}
                      </Badge>
                    </div>

                    <div className="mt-3">
                      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(0,1.6fr)_minmax(90px,0.8fr)_auto] px-0 py-0 font-medium text-muted-foreground text-xs">
                        <span>User</span>
                        <span>Role</span>
                        <span>Email</span>
                        <span>Date added</span>
                        <span className="text-right">Action</span>
                      </div>
                      <div className="divide-y divide-border/60">
                        {workspaceMembers.length === 0 ? (
                          <div className="px-4 py-6 text-muted-foreground text-sm">
                            No members found.
                          </div>
                        ) : (
                          workspaceMembers.map((member, index) => {
                            const memberKey =
                              member.id ??
                              member.email ??
                              member.userId ??
                              `member-${index}`;
                            const isCurrentUser =
                              Boolean(currentUserEmail) &&
                              member.email?.toLowerCase() === currentUserEmail;
                            const isOwner =
                              member.role.toLowerCase() === "owner";

                            return (
                              <div
                                className="grid grid-cols-[minmax(0,1.5fr)_minmax(110px,0.8fr)_minmax(0,1.6fr)_minmax(90px,0.8fr)_auto] items-center gap-3 px-0 py-2 text-sm"
                                key={memberKey}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    <SensitiveText
                                      className="max-w-[220px]"
                                      privacyMode={privacyMode}
                                      value={
                                        member.name ??
                                        member.email ??
                                        "Unknown user"
                                      }
                                    />
                                  </p>
                                </div>
                                <span className="text-muted-foreground capitalize">
                                  {member.role}
                                </span>
                                <p className="truncate text-muted-foreground">
                                  <SensitiveText
                                    className="max-w-[260px]"
                                    privacyMode={privacyMode}
                                    value={member.email ?? "—"}
                                  />
                                </p>
                                <span className="text-muted-foreground">—</span>
                                <div className="flex justify-end">
                                  {isOwner || isCurrentUser ? (
                                    <Badge
                                      className="rounded-full px-3 py-1 text-xs"
                                      variant="outline"
                                    >
                                      You
                                    </Badge>
                                  ) : (
                                    <Button
                                      onClick={() => {
                                        if (
                                          !(
                                            selectedWorkspace &&
                                            (member.id ?? member.email)
                                          )
                                        ) {
                                          return;
                                        }
                                        void (async () => {
                                          const response = await fetch(
                                            `/api/workspaces/${selectedWorkspace.workspaceId}/share/members`,
                                            {
                                              method: "DELETE",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify({
                                                memberIdOrEmail:
                                                  member.id ?? member.email,
                                              }),
                                            }
                                          );
                                          setWorkspaceStatus(
                                            response.ok
                                              ? "Member removed."
                                              : "Unable to remove member."
                                          );
                                          if (response.ok) {
                                            await refreshMembers(
                                              selectedWorkspace.workspaceId
                                            );
                                            await refreshWorkspaceUsage(
                                              selectedWorkspace.workspaceId
                                            );
                                          }
                                        })();
                                      }}
                                      size="xs"
                                      type="button"
                                      variant="ghost"
                                    >
                                      Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Input
                        onChange={(e) => setWorkspaceEmail(e.target.value)}
                        placeholder="teammate@example.com"
                        value={workspaceEmail}
                      />
                      <Button
                        disabled={
                          isInvitingMember ||
                          !selectedWorkspace ||
                          !workspaceEmail.trim()
                        }
                        onClick={() => {
                          if (!selectedWorkspace) {
                            return;
                          }
                          void (async () => {
                            setIsInvitingMember(true);
                            try {
                              const response = await fetch(
                                `/api/workspaces/${selectedWorkspace.workspaceId}/share/members`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    email: workspaceEmail.trim(),
                                  }),
                                }
                              );
                              setWorkspaceStatus(
                                response.ok
                                  ? "Member added."
                                  : "Unable to add member."
                              );
                              if (response.ok) {
                                setWorkspaceEmail("");
                                await refreshMembers(
                                  selectedWorkspace.workspaceId
                                );
                                await refreshWorkspaceUsage(
                                  selectedWorkspace.workspaceId
                                );
                              }
                            } finally {
                              setIsInvitingMember(false);
                            }
                          })();
                        }}
                        size="sm"
                        type="button"
                      >
                        Add member
                      </Button>
                    </div>

                    {workspaceStatus ? (
                      <p className="mt-2 text-muted-foreground text-xs">
                        {workspaceStatus}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Section>

              <Divider />

              <Section description="" title="Workspaces">
                <div className="max-w-2xl space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="New workspace name"
                      value={workspaceName}
                    />
                    <Button
                      disabled={isCreatingWorkspace || !workspaceName.trim()}
                      onClick={() => {
                        void (async () => {
                          setIsCreatingWorkspace(true);
                          try {
                            const response = await fetch("/api/workspaces", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                name: workspaceName.trim(),
                              }),
                            });
                            if (!response.ok) {
                              setWorkspaceStatus("Unable to create workspace.");
                              return;
                            }
                            setWorkspaceStatus("Workspace created.");
                            setWorkspaceName("");
                            await refreshWorkspaces();
                          } finally {
                            setIsCreatingWorkspace(false);
                          }
                        })();
                      }}
                      size="sm"
                      type="button"
                    >
                      Create
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {workspaces.map((workspace) => (
                      <Button
                        className={[
                          "h-auto w-full justify-start gap-3 px-0 py-2 text-left text-sm transition-colors hover:bg-transparent",
                          workspace.workspaceId === activeWorkspaceId
                            ? "font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                        key={workspace.workspaceId}
                        onClick={() => {
                          setActiveWorkspaceId(workspace.workspaceId);
                          setWorkspaceStatus(null);
                        }}
                        type="button"
                        variant="ghost"
                      >
                        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate">
                          {workspace.name}
                        </span>
                        {workspace.workspaceId === activeWorkspaceId ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                      </Button>
                    ))}
                  </div>
                </div>
              </Section>

              <Divider />

              <Section description="" title="Workspace Danger Zone">
                <div className="max-w-md space-y-3">
                  <div className="flex items-start gap-2 text-red-600">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs">
                      Type the workspace name exactly. If verification is
                      needed, we will prompt you after you continue.
                    </p>
                  </div>
                  <Input
                    disabled={!selectedWorkspace}
                    onChange={(e) => setWorkspaceDeleteConfirm(e.target.value)}
                    placeholder={selectedWorkspace?.name ?? "Workspace name"}
                    value={workspaceDeleteConfirm}
                  />
                  <Button
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={
                      !selectedWorkspace ||
                      workspaceDeleteConfirm.trim() !==
                        (selectedWorkspace?.name ?? "")
                    }
                    onClick={() => {
                      if (!selectedWorkspace) {
                        return;
                      }
                      if (!sudoActive) {
                        requestSudoForAction(
                          `delete ${selectedWorkspace.name}`,
                          runDeleteWorkspace
                        );
                        return;
                      }
                      void runDeleteWorkspace();
                    }}
                    size="sm"
                    type="button"
                  >
                    Delete Workspace
                  </Button>
                </div>
              </Section>
            </>
          ) : null}

          {/* ── Data Tab ── */}
          {currentTab === "data" ? (
            <>
              <Section
                description="Connect external sources and import them through the existing note and upload pipelines."
                title="Data Imports"
              >
                <DataImportsSection workspaces={workspaces} />
              </Section>

              <Divider />

              <Section
                description="How workspace data is retained and cleaned up."
                title="Data Retention"
              >
                <div className="max-w-md space-y-2">
                  <p className="text-muted-foreground text-sm">
                    Deleted files and folders are moved to Trash and retained
                    for 30 days before permanent cleanup.
                  </p>
                </div>
              </Section>
            </>
          ) : null}

          {/* ── Keyboard Shortcuts Tab ── */}
          {currentTab === "shortcuts" ? (
            <Section
              description="Implemented shortcuts available in Avenire."
              title="Keyboard Shortcuts"
            >
              <div className="max-w-3xl space-y-4">
                <div className="border-border/60 border-b pb-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                    <Key className="size-3.5 text-muted-foreground" />
                    <Input
                      aria-label="Search shortcuts"
                      className="h-auto border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                      onChange={(event) => {
                        setShortcutQuery(event.target.value);
                      }}
                      placeholder="Search shortcuts..."
                      value={shortcutQuery}
                    />
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                      {filteredShortcutCount} total
                    </span>
                  </div>
                </div>

                {filteredShortcutCount === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No shortcuts match that search.
                  </div>
                ) : (
                  <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                    {filteredShortcutGroups.map((group) => (
                      <div key={group.name}>
                        <div className="mb-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                          {group.name}
                        </div>
                        <ul className="flex flex-col">
                          {group.items.map((shortcut) => (
                            <li
                              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-foreground/[0.03]"
                              key={shortcut.label}
                            >
                              <span className="text-sm">{shortcut.label}</span>
                              <KbdGroup className="shrink-0">
                                {shortcut.keys.map((key) => (
                                  <Kbd
                                    className="border border-border/80 bg-muted/80"
                                    key={`${shortcut.label}-${key}`}
                                  >
                                    {key}
                                  </Kbd>
                                ))}
                              </KbdGroup>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          ) : null}
        </div>
      </div>

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
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold text-base md:text-lg">{title}</h2>
        {description ? (
          <p className="hidden text-muted-foreground text-sm sm:block">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-border/40 border-t" />;
}

function UsageStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="p-0">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground text-sm">{label}</p>
          <p className="mt-2 font-semibold text-xl tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
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

function PlanCard({
  name,
  price,
  yearlyPrice,
  features,
  current,
  canUpgrade = true,
  popular,
  onUpgrade,
}: {
  name: string;
  price: string;
  yearlyPrice?: string;
  features: string[];
  current: boolean;
  canUpgrade?: boolean;
  popular?: boolean;
  onUpgrade: (() => void) | null;
}) {
  const yearlyDiscount =
    name === BILLING_PLANS.core.label
      ? getYearlyDiscountPercent("core")
      : name === BILLING_PLANS.scholar.label
        ? getYearlyDiscountPercent("scholar")
        : null;

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
        {yearlyPrice ? (
          <p className="mt-0.5 text-muted-foreground text-xs">
            {yearlyPrice}
            {yearlyDiscount ? (
              <span className="ml-1 text-primary">Save {yearlyDiscount}%</span>
            ) : null}
          </p>
        ) : null}
      </div>
      <ul className="flex-1 space-y-1.5">
        {features.map((f) => (
          <li
            className="flex items-start gap-2 text-muted-foreground text-xs"
            key={f}
          >
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {current ? (
        <Button className="w-full" disabled size="sm" variant="outline">
          Current Plan
        </Button>
      ) : !canUpgrade ? (
        <Button className="w-full" disabled size="sm" variant="outline">
          Included
        </Button>
      ) : (
        <Button className="w-full" onClick={onUpgrade ?? undefined} size="sm">
          Upgrade
        </Button>
      )}
    </div>
  );
}
