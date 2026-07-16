import { describe, expect, it } from "vitest";
import {
  DatabaseOperationError,
  ExternalOperationCancelled,
  ProviderOperationError,
  StorageOperationError,
  serializeExternalOperationError,
} from "./external-operation-errors";

describe("external operation error contracts", () => {
  it.each([
    [
      ProviderOperationError.make({
        cause: new Error("secret Polar token pol_live_123"),
        operation: "polar.ingestUsage",
        retryable: true,
      }),
      503,
      {
        code: "PROVIDER_UNAVAILABLE",
        error: "External provider unavailable",
        retryable: true,
      },
    ],
    [
      StorageOperationError.make({
        cause: new Error("signed URL https://secret.example/upload"),
        operation: "storage.upload",
        retryable: true,
      }),
      503,
      {
        code: "STORAGE_UNAVAILABLE",
        error: "File storage unavailable",
        retryable: true,
      },
    ],
    [
      DatabaseOperationError.make({
        cause: new Error("postgres://user:password@internal/db"),
        operation: "billing.claimPendingEvents",
        retryable: true,
      }),
      503,
      {
        code: "DATABASE_UNAVAILABLE",
        error: "Data service unavailable",
        retryable: true,
      },
    ],
    [
      ExternalOperationCancelled.make({ operation: "storage.upload" }),
      499,
      {
        code: "OPERATION_CANCELLED",
        error: "Operation cancelled",
        retryable: false,
      },
    ],
  ])("serializes %s without leaking its cause", (error, status, body) => {
    const serialized = serializeExternalOperationError(error);

    expect(serialized).toEqual({ body, status });
    expect(JSON.stringify(serialized)).not.toContain("secret");
    expect(JSON.stringify(serialized)).not.toContain("password");
  });
});
