import {
  Building as Building2,
  CreditCard,
  Database,
  Key,
  Shield,
  SlidersHorizontal,
  User,
} from "@phosphor-icons/react";

export interface WorkspaceSummary {
  logo: string | null;
  name: string;
  organizationId: string;
  rootFolderId: string;
  workspaceId: string;
}

export interface WorkspaceMember {
  email: string | null;
  id: string | null;
  name: string | null;
  role: string;
  userId: string | null;
}

export interface WorkspaceUsage {
  fileCount: number;
  folderCount: number;
  indexedFileCount: number;
  memberCount: number;
  pendingIngestionCount: number;
  totalSizeBytes: number;
}

export interface AccountEntry {
  accountId?: string;
  id?: string;
  providerId?: string;
}

export interface PasskeyEntry {
  createdAt?: string;
  deviceType?: string;
  id: string;
  name?: string | null;
}

export interface MeterUsage {
  fourHourBalance: number;
  fourHourCapacity: number;
  overageBalance: number;
  overageCapacity: number;
  refillAt: string | null;
  totalBalance: number;
  totalCapacity: number;
}

export interface BillingUsage {
  chat: MeterUsage;
  combined: {
    totalCapacity: number;
    totalBalance: number;
  };
  entitlements?: {
    features: Record<string, boolean>;
    responseSpeed: "priority" | "standard";
  };
  plan: "access" | "core" | "scholar";
  storage: {
    limitBytes: number;
    remainingBytes: number;
    usedBytes: number;
  };
}

export interface SettingsInitialUser {
  avatar?: string | null;
  email: string;
  id: string;
  name: string;
}

export interface SettingsSessionFallback {
  user: {
    email: string;
    id: string;
    image: string | null;
    name: string;
  };
}

export const SETTINGS_TABS = [
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

export type TabKey = (typeof SETTINGS_TABS)[number]["key"];

export const KEYBOARD_SHORTCUT_GROUPS = [
  {
    name: "General",
    items: [
      { label: "Command Palette", keys: ["Ctrl", "Shift", "P"] },
      { label: "Open Files", keys: ["Ctrl", "4"] },
    ],
  },
  {
    name: "Workspace",
    items: [
      { label: "Create Folder", keys: ["Ctrl", "Shift", "N"] },
      { label: "Upload File", keys: ["Ctrl", "U"] },
      { label: "Upload Folder", keys: ["Ctrl", "Shift", "U"] },
      { label: "Open Selection", keys: ["Ctrl", "O"] },
      { label: "Move Selection Up", keys: ["Ctrl", "Shift", "M"] },
    ],
  },
  {
    name: "Editing",
    items: [
      { label: "New Method", keys: ["Ctrl", "N"] },
      { label: "New Note", keys: ["Ctrl", "Shift", "O"] },
      { label: "Import Link", keys: ["Ctrl", "Shift", "L"] },
    ],
  },
] as const;

export const KEYBOARD_DETECTED_STORAGE_KEY = "avenire:keyboard-detected";

export const PLAN_LABELS: Record<string, string> = {
  access: "Free Plan",
  core: "Core Plan",
  scholar: "Scholar Plan",
};

export const THEME_PREVIEW = {
  light: {
    outer: "#fcfcfc",
    inner: "#141414f0",
  },
  dark: {
    outer: "#141414",
    inner: "#e4e4e4eb",
  },
} as const;

export function formatBytes(bytes: number) {
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

export function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

export function formatRefillAt(value: string | null) {
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

export function createSettingsSessionFallback(
  initialUser?: SettingsInitialUser | null
): SettingsSessionFallback | null {
  if (!initialUser) {
    return null;
  }

  return {
    user: {
      email: initialUser.email,
      id: initialUser.id,
      image: initialUser.avatar ?? null,
      name: initialUser.name,
    },
  };
}
