import { Schema } from "effect-v4";

const externalOperationFields = {
  cause: Schema.Defect(),
  operation: Schema.String,
  retryable: Schema.Boolean,
};

export class ProviderOperationError extends Schema.TaggedErrorClass<ProviderOperationError>()(
  "ProviderOperationError",
  externalOperationFields
) {}

export class StorageOperationError extends Schema.TaggedErrorClass<StorageOperationError>()(
  "StorageOperationError",
  externalOperationFields
) {}

export class DatabaseOperationError extends Schema.TaggedErrorClass<DatabaseOperationError>()(
  "DatabaseOperationError",
  externalOperationFields
) {}

export class ExternalOperationCancelled extends Schema.TaggedErrorClass<ExternalOperationCancelled>()(
  "ExternalOperationCancelled",
  { operation: Schema.String }
) {}

export type ExternalOperationError =
  | ProviderOperationError
  | StorageOperationError
  | DatabaseOperationError
  | ExternalOperationCancelled;

export class PublicExternalOperationError extends Schema.Class<PublicExternalOperationError>(
  "PublicExternalOperationError"
)({
  code: Schema.String,
  error: Schema.String,
  retryable: Schema.Boolean,
}) {}

export interface SerializedExternalOperationError {
  readonly body: PublicExternalOperationError;
  readonly status: number;
}

export function serializeExternalOperationError(
  error: ExternalOperationError
): SerializedExternalOperationError {
  switch (error._tag) {
    case "ProviderOperationError":
      return {
        body: new PublicExternalOperationError({
          code: "PROVIDER_UNAVAILABLE",
          error: "External provider unavailable",
          retryable: error.retryable,
        }),
        status: 503,
      };
    case "StorageOperationError":
      return {
        body: new PublicExternalOperationError({
          code: "STORAGE_UNAVAILABLE",
          error: "File storage unavailable",
          retryable: error.retryable,
        }),
        status: 503,
      };
    case "DatabaseOperationError":
      return {
        body: new PublicExternalOperationError({
          code: "DATABASE_UNAVAILABLE",
          error: "Data service unavailable",
          retryable: error.retryable,
        }),
        status: 503,
      };
    case "ExternalOperationCancelled":
      return {
        body: new PublicExternalOperationError({
          code: "OPERATION_CANCELLED",
          error: "Operation cancelled",
          retryable: false,
        }),
        status: 499,
      };
  }
}
