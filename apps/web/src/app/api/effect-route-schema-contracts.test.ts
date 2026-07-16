import { Exit, Schema } from "effect-v4";
import { describe, expect, it } from "vitest";

import { capturePayloadSchema } from "./capture/capture-route-model";
import { extensionDestinationRequestSchema } from "./extension/extension-route-contracts";
import {
  flashcardCardCreateSchema,
  flashcardCardUpdateSchema,
  flashcardEnrollmentSchema,
  flashcardReviewSchema,
  flashcardSetMutationSchema,
} from "./flashcards/flashcard-route-model";
import {
  googleDriveImportRequestSchema,
  importDestinationRequestSchema,
  notionImportRequestSchema,
} from "./imports/import-route-contracts";
import {
  misconceptionImproveSchema,
  misconceptionScopeSchema,
} from "./misconceptions/misconception-route-model";
import { noteSyncSchema, noteUpdateSchema } from "./notes/note-route-model";
import { SudoRouteRequest } from "./security/sudo/sudo-route-model";
import { taskCreateSchema, taskMutationSchema, taskResourceSchema } from "./tasks/task-route-model";
import { userSettingsMutationSchema } from "./user-settings/user-settings-route-model";
import { workspaceFileContentPatchSchema } from "./workspaces/[workspaceUuid]/files/[fileUuid]/content/workspace-file-content-route-model";
import { workspaceFileShareGrantSchema } from "./workspaces/[workspaceUuid]/files/[fileUuid]/share/workspace-file-share-route-model";
import { workspaceFilePatchSchema } from "./workspaces/[workspaceUuid]/files/[fileUuid]/workspace-file-route-model";
import { workspaceFileDedupeLookupRequestSchema } from "./workspaces/[workspaceUuid]/files/dedupe/lookup/workspace-file-dedupe-lookup-model";
import {
  workspaceFileRegisterBulkFileSchema,
  workspaceFileRegisterBulkRequestSchema,
} from "./workspaces/[workspaceUuid]/files/register/bulk/workspace-file-register-bulk-model";
import { WorkspaceFileRegisterRequest } from "./workspaces/[workspaceUuid]/files/register/workspace-file-register-model";
import { workspaceFolderShareGrantSchema } from "./workspaces/[workspaceUuid]/folders/[folderUuid]/share/workspace-folder-share-route-model";
import { workspaceFolderPatchSchema } from "./workspaces/[workspaceUuid]/folders/[folderUuid]/workspace-folder-route-model";
import { workspaceFolderCreatePayloadSchema } from "./workspaces/[workspaceUuid]/folders/workspace-folders-route-model";
import { workspaceItemArchiveRequestSchema } from "./workspaces/[workspaceUuid]/items/archive/workspace-item-archive-model";
import { workspaceItemDuplicateSchema } from "./workspaces/[workspaceUuid]/items/duplicate/workspace-item-duplicate-model";
import { workspaceLinkCreateSchema } from "./workspaces/[workspaceUuid]/links/workspace-links-route-model";
import {
  workspaceShareInviteSchema,
  workspaceShareRemoveSchema,
} from "./workspaces/[workspaceUuid]/share/members/workspace-share-members-model";
import { WorkspaceTrashMutationRequest } from "./workspaces/[workspaceUuid]/trash/workspace-trash-route-model";
import { workspaceLogoPatchSchema } from "./workspaces/[workspaceUuid]/workspace-route-model";
import { workspaceInvitationActionSchema } from "./workspaces/workspace-directory-route-model";
import { workspaceCreateSchema } from "./workspaces/workspaces-route-model";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const hash = "a".repeat(64);

function schemaContract<A, I, R>(
  name: string,
  schema: Schema.Schema<A, I, R>,
  valid: unknown,
  invalid: unknown
) {
  describe(name, () => {
    it("accepts its public request shape", () => {
      expect(Exit.isSuccess(Schema.decodeUnknownExit(schema)(valid))).toBe(true);
    });

    it("rejects an invalid public request shape", () => {
      expect(Exit.isFailure(Schema.decodeUnknownExit(schema)(invalid))).toBe(true);
    });
  });
}

schemaContract("capturePayloadSchema", capturePayloadSchema, { kind: "note", content: "hello" }, { kind: "other" });
schemaContract("extensionDestinationRequestSchema", extensionDestinationRequestSchema, { folderId: uuid, workspaceId: uuid }, { folderId: "bad", workspaceId: uuid });
schemaContract("flashcardReviewSchema", flashcardReviewSchema, { cardId: "card", rating: "good" }, { cardId: "", rating: "good" });
schemaContract("flashcardSetMutationSchema", flashcardSetMutationSchema, { title: "Set" }, { tags: "tag" });
schemaContract("flashcardCardCreateSchema", flashcardCardCreateSchema, { frontMarkdown: "Q" }, { tags: [1] });
schemaContract("flashcardCardUpdateSchema", flashcardCardUpdateSchema, { backMarkdown: "A" }, { source: [] });
schemaContract("flashcardEnrollmentSchema", flashcardEnrollmentSchema, { newCardsPerDay: 20, status: "active" }, { newCardsPerDay: 0 });
schemaContract("importDestinationRequestSchema", importDestinationRequestSchema, { folderId: uuid, workspaceId: uuid }, { folderId: uuid });
schemaContract("notionImportRequestSchema", notionImportRequestSchema, { pageIds: ["page"] }, { pageIds: [] });
schemaContract("googleDriveImportRequestSchema", googleDriveImportRequestSchema, { fileIds: ["file"] }, { fileIds: [""] });
schemaContract("misconceptionScopeSchema", misconceptionScopeSchema, { concept: "Concept", subject: "Subject", topic: "Topic" }, { concept: " ", subject: "Subject", topic: "Topic" });
schemaContract("misconceptionImproveSchema", misconceptionImproveSchema, { concept: "Concept", subject: "Subject", topic: "Topic", delta: 0.2 }, { concept: "Concept", subject: "Subject", topic: "Topic", delta: Number.NaN });
schemaContract("noteUpdateSchema", noteUpdateSchema, { content: "note" }, { content: 1 });
schemaContract("noteSyncSchema", noteSyncSchema, { base: "old", current: "new" }, { base: "old" });
schemaContract("SudoRouteRequest", SudoRouteRequest, { action: "request" }, null);
schemaContract("taskResourceSchema", taskResourceSchema, { href: "/file", resourceId: "file", resourceType: "file", subtitle: null, title: "File" }, { href: "", resourceId: "file", resourceType: "file", subtitle: null, title: "File" });
schemaContract("taskMutationSchema", taskMutationSchema, { status: "planned" }, { status: "unknown" });
schemaContract("taskCreateSchema", taskCreateSchema, { title: "Task" }, { title: " " });
schemaContract("userSettingsMutationSchema", userSettingsMutationSchema, { onboardingCompleted: true }, { onboardingCompleted: "yes" });
schemaContract("workspaceFileContentPatchSchema", workspaceFileContentPatchSchema, { content: "text", sizeBytes: 4 }, { sizeBytes: -1 });
schemaContract("workspaceFileShareGrantSchema", workspaceFileShareGrantSchema, { email: "a@example.com", permission: "viewer" }, { permission: "owner" });
schemaContract("workspaceFilePatchSchema", workspaceFilePatchSchema, { name: "File" }, { name: "" });
schemaContract("workspaceFileDedupeLookupRequestSchema", workspaceFileDedupeLookupRequestSchema, { files: [{ clientUploadId: "upload", folderId: uuid, hashSha256: hash, name: "file", sizeBytes: 1 }] }, { files: [] });
schemaContract("workspaceFileRegisterBulkFileSchema", workspaceFileRegisterBulkFileSchema, { clientUploadId: "upload", folderId: uuid, name: "note", content: "body" }, { clientUploadId: "upload", folderId: uuid, name: "upload", storageKey: "key", storageUrl: "ftp://invalid", sizeBytes: 1 });
schemaContract("workspaceFileRegisterBulkRequestSchema", workspaceFileRegisterBulkRequestSchema, { files: [{ clientUploadId: "upload", folderId: uuid, name: "note", content: "body" }] }, { files: [] });
schemaContract("WorkspaceFileRegisterRequest", WorkspaceFileRegisterRequest, { name: "file" }, { sizeBytes: "large" });
schemaContract("workspaceFolderShareGrantSchema", workspaceFolderShareGrantSchema, { permission: "editor" }, { permission: "owner" });
schemaContract("workspaceFolderPatchSchema", workspaceFolderPatchSchema, { name: "Folder" }, { name: 4 });
schemaContract("workspaceFolderCreatePayloadSchema", workspaceFolderCreatePayloadSchema, { name: "Folder", parentId: null }, { name: "Folder" });
schemaContract("workspaceItemArchiveRequestSchema", workspaceItemArchiveRequestSchema, { items: [{ id: "file", kind: "file" }] }, { items: [] });
schemaContract("workspaceItemDuplicateSchema", workspaceItemDuplicateSchema, { id: "file", kind: "file" }, { id: "file", kind: "link" });
schemaContract("workspaceLinkCreateSchema", workspaceLinkCreateSchema, { url: "https://avenire.space" }, { url: 1 });
schemaContract("workspaceShareInviteSchema", workspaceShareInviteSchema, { email: "a@example.com", role: "member" }, { email: " ", role: "member" });
schemaContract("workspaceShareRemoveSchema", workspaceShareRemoveSchema, { memberIdOrEmail: "member" }, { memberIdOrEmail: " " });
schemaContract("WorkspaceTrashMutationRequest", WorkspaceTrashMutationRequest, { items: [{ id: "file", kind: "file" }], operation: "restore" }, { items: [], operation: "restore" });
schemaContract("workspaceLogoPatchSchema", workspaceLogoPatchSchema, { logo: null }, { logo: 3 });
schemaContract("workspaceInvitationActionSchema", workspaceInvitationActionSchema, { action: "accept" }, { action: 1 });
schemaContract("workspaceCreateSchema", workspaceCreateSchema, { name: "Workspace" }, { name: false });
