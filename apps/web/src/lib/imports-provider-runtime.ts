import "server-only";

import { auth } from "@avenire/auth/server";
import {
  createExtensionDestinationPreset,
  getExtensionDestinationPreset,
  getLatestAuthAccountForUser,
  listAuthAccountsForUser,
  listExtensionDestinationPresets,
  listWorkspaceFolders,
  listWorkspacesForUser,
  updateExtensionDestinationPreset,
} from "@avenire/database";
import { userCanEditFolder } from "@/lib/file-data";
import { GOOGLE_IMPORT_SCOPES } from "@/lib/imports-google-scopes";

export const DATA_IMPORT_PRESET_LABEL = "Avenire Data Import";

interface AuthAccountRecord {
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  accountId: string;
  createdAt: Date;
  id: string;
  providerId: string;
  refreshToken: string | null;
  scope: string | null;
  updatedAt: Date;
}

export interface ImportDestinationRecord {
  createdAt: string;
  folderId: string;
  folderName: string;
  id: string;
  label: string;
  organizationId: string;
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
}

export interface ImportProviderStatus {
  accountId: string | null;
  configured: boolean;
  connected: boolean;
  hasRefreshToken: boolean;
  hasUsableAccessToken: boolean;
  ready: boolean;
  scopes: string[];
}

export function parseScopeList(scope: string | null | undefined) {
  return (scope ?? "")
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function hasScopes(currentScopes: string[], requiredScopes: string[]) {
  const normalized = new Set(currentScopes);
  return requiredScopes.every((scope) => {
    if (normalized.has(scope)) {
      return true;
    }

    if (scope === "email") {
      return normalized.has("https://www.googleapis.com/auth/userinfo.email");
    }

    if (scope === "profile") {
      return normalized.has("https://www.googleapis.com/auth/userinfo.profile");
    }

    return false;
  });
}

export function hasUsableAccessToken(account: AuthAccountRecord | null) {
  if (!account?.accessToken?.trim()) {
    return false;
  }

  if (!account.accessTokenExpiresAt) {
    return true;
  }

  return account.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
}

export function serializeDestination(
  preset: {
    createdAt: Date;
    folderId: string;
    folderName: string;
    id: string;
    label: string;
    organizationId: string;
    updatedAt: Date;
    workspaceId: string;
    workspaceName: string;
  } | null
): ImportDestinationRecord | null {
  if (!preset) {
    return null;
  }

  return {
    ...preset,
    createdAt: preset.createdAt.toISOString(),
    updatedAt: preset.updatedAt.toISOString(),
  };
}

function serializeAuthAccountRecord(account: AuthAccountRecord) {
  return {
    accessTokenExpiresAt: account.accessTokenExpiresAt?.toISOString() ?? null,
    accessTokenPresent: Boolean(account.accessToken?.trim()),
    accountId: account.accountId,
    createdAt: account.createdAt.toISOString(),
    id: account.id,
    providerId: account.providerId,
    refreshTokenPresent: Boolean(account.refreshToken?.trim()),
    scope: account.scope,
    scopes: parseScopeList(account.scope),
    updatedAt: account.updatedAt.toISOString(),
  };
}

async function getLatestImportAccount(
  userId: string,
  providerId: "google" | "notion"
) {
  const record = await getLatestAuthAccountForUser({
    providerId,
    userId,
  });

  return (record ?? null) as AuthAccountRecord | null;
}

async function getImportProviderStatus(
  userId: string,
  providerId: "google" | "notion"
): Promise<ImportProviderStatus> {
  const account = await getLatestImportAccount(userId, providerId);
  const scopes = parseScopeList(account?.scope);
  const configured =
    providerId === "google"
      ? Boolean(
          process.env.AUTH_GOOGLE_ID?.trim() &&
            process.env.AUTH_GOOGLE_SECRET?.trim()
        )
      : Boolean(
          process.env.AUTH_NOTION_ID?.trim() &&
            process.env.AUTH_NOTION_SECRET?.trim()
        );

  const requiredScopes = providerId === "google" ? GOOGLE_IMPORT_SCOPES : [];
  const hasRequiredProviderScopes =
    requiredScopes.length === 0 || hasScopes(scopes, requiredScopes);

  return {
    accountId: account?.accountId ?? null,
    configured,
    connected: Boolean(account),
    hasRefreshToken: Boolean(account?.refreshToken),
    hasUsableAccessToken: hasUsableAccessToken(account),
    ready:
      configured &&
      Boolean(account) &&
      (Boolean(account?.refreshToken) || hasUsableAccessToken(account)) &&
      hasRequiredProviderScopes,
    scopes,
  };
}

export async function getProviderAccessToken(
  userId: string,
  providerId: "google" | "notion"
) {
  const status = await getImportProviderStatus(userId, providerId);
  if (!status.configured) {
    throw new Error(`${providerId} import is not configured.`);
  }
  if (!status.connected) {
    throw new Error(`${providerId} account is not connected.`);
  }
  if (!(status.hasRefreshToken || status.hasUsableAccessToken)) {
    throw new Error(`${providerId} account must be reconnected.`);
  }
  if (
    providerId === "google" &&
    !hasScopes(status.scopes, GOOGLE_IMPORT_SCOPES)
  ) {
    throw new Error("Google account is missing Drive import scopes.");
  }

  const account = await getLatestImportAccount(userId, providerId);
  let response:
    | {
        accessToken?: string;
        scopes?: string[];
      }
    | undefined;

  try {
    response = await (
      auth.api.getAccessToken as (input: {
        body: { providerId: string; userId: string };
      }) =>
        | Promise<{
            accessToken?: string;
            scopes?: string[];
          }>
        | undefined
    )?.({
      body: {
        providerId,
        userId,
      },
    });
  } catch {
    response = undefined;
  }

  const accessToken =
    response?.accessToken?.trim() ?? account?.accessToken?.trim() ?? "";
  if (!accessToken) {
    throw new Error(`Unable to get a valid ${providerId} access token.`);
  }

  return {
    accessToken,
    scopes: response?.scopes ?? status.scopes,
  };
}

async function getDataImportDestinationInternal(userId: string) {
  const presets = await listExtensionDestinationPresets(userId);
  return (
    presets.find((preset) => preset.label === DATA_IMPORT_PRESET_LABEL) ?? null
  );
}

export async function getDataImportOverview(userId: string) {
  const [google, notion, destination] = await Promise.all([
    getImportProviderStatus(userId, "google"),
    getImportProviderStatus(userId, "notion"),
    getDataImportDestinationInternal(userId),
  ]);

  return {
    destination: serializeDestination(destination),
    providers: {
      google,
      notion,
    },
  };
}

export async function getImportProviderDebugSnapshot(userId: string) {
  const [googleStatus, notionStatus, googleAccounts, notionAccounts] =
    await Promise.all([
      getImportProviderStatus(userId, "google"),
      getImportProviderStatus(userId, "notion"),
      listAuthAccountsForUser({ providerId: "google", userId }),
      listAuthAccountsForUser({ providerId: "notion", userId }),
    ]);

  const getAccessTokenResult = async (providerId: "google" | "notion") => {
    try {
      const token = await getProviderAccessToken(userId, providerId);
      return {
        ok: true,
        scopes: token.scopes,
        tokenPresent: Boolean(token.accessToken),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        ok: false,
      };
    }
  };

  const [googleTokenCheck, notionTokenCheck] = await Promise.all([
    getAccessTokenResult("google"),
    getAccessTokenResult("notion"),
  ]);

  return {
    google: {
      accounts: googleAccounts.map((account) =>
        serializeAuthAccountRecord(account as AuthAccountRecord)
      ),
      status: googleStatus,
      tokenCheck: googleTokenCheck,
    },
    notion: {
      accounts: notionAccounts.map((account) =>
        serializeAuthAccountRecord(account as AuthAccountRecord)
      ),
      status: notionStatus,
      tokenCheck: notionTokenCheck,
    },
  };
}

export async function listImportDestinationFolders(input: {
  userId: string;
  workspaceId: string;
}) {
  const workspaceSummaries = await listWorkspacesForUser(input.userId);
  const workspace = workspaceSummaries.find(
    (entry) => entry.workspaceId === input.workspaceId
  );

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const folders = await listWorkspaceFolders(input.workspaceId, input.userId);

  return {
    rootFolderId: workspace.rootFolderId,
    workspace: {
      name: workspace.name,
      organizationId: workspace.organizationId,
      rootFolderId: workspace.rootFolderId,
      workspaceId: workspace.workspaceId,
    },
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      readOnly: folder.readOnly,
    })),
  };
}

export async function saveDataImportDestination(input: {
  folderId: string;
  userId: string;
  workspaceId: string;
}) {
  const workspaceSummaries = await listWorkspacesForUser(input.userId);
  const workspace = workspaceSummaries.find(
    (entry) => entry.workspaceId === input.workspaceId
  );
  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const canEdit = await userCanEditFolder({
    workspaceId: input.workspaceId,
    folderId: input.folderId,
    userId: input.userId,
  });
  if (!canEdit) {
    throw new Error("Read-only folder.");
  }

  const folders = await listWorkspaceFolders(input.workspaceId, input.userId);
  const folder = folders.find((entry) => entry.id === input.folderId);
  if (!folder) {
    throw new Error("Folder not found.");
  }

  const existingPreset = await getDataImportDestinationInternal(input.userId);
  const saved = existingPreset
    ? await updateExtensionDestinationPreset({
        folderId: folder.id,
        folderName: folder.name,
        label: DATA_IMPORT_PRESET_LABEL,
        organizationId: workspace.organizationId,
        presetId: existingPreset.id,
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.name,
      })
    : await createExtensionDestinationPreset({
        folderId: folder.id,
        folderName: folder.name,
        label: DATA_IMPORT_PRESET_LABEL,
        organizationId: workspace.organizationId,
        userId: input.userId,
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.name,
      });

  if (!saved) {
    throw new Error("Unable to save import destination.");
  }

  return serializeDestination(saved);
}

export async function requireDataImportDestination(userId: string) {
  const preset = await getDataImportDestinationInternal(userId);
  if (!preset) {
    throw new Error("Save an import destination before importing.");
  }

  const currentPreset = await getExtensionDestinationPreset({
    presetId: preset.id,
    userId,
  });
  if (!currentPreset) {
    throw new Error("Import destination is no longer available.");
  }

  const canEdit = await userCanEditFolder({
    workspaceId: currentPreset.workspaceId,
    folderId: currentPreset.folderId,
    userId,
  });
  if (!canEdit) {
    throw new Error("Import destination is read-only.");
  }

  return currentPreset;
}
