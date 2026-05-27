interface UploadThingError {
  code?: string;
  message?: string;
}

const UPLOAD_TOO_LARGE_MESSAGE = "File size exceeds the maximum allowed limit";

const UPLOADTHING_ERROR_CODES = {
  FILE_LIMIT_EXCEEDED: "FILE_LIMIT_EXCEEDED",
  TOO_LARGE: "TOO_LARGE",
  TOO_MANY_FILES: "TOO_MANY_FILES",
} as const;

export function getUploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const uploadError = error as UploadThingError;
    if (uploadError.code === UPLOADTHING_ERROR_CODES.TOO_LARGE) {
      return UPLOAD_TOO_LARGE_MESSAGE;
    }
    if (uploadError.code === UPLOADTHING_ERROR_CODES.FILE_LIMIT_EXCEEDED) {
      return "File limit exceeded for this upload type";
    }
    if (uploadError.code === UPLOADTHING_ERROR_CODES.TOO_MANY_FILES) {
      return "Too many files selected for upload";
    }
    const message = error.message.trim().toLowerCase();
    if (
      message.includes("metadata not received") ||
      message.includes("metadata not recieved") ||
      message === "metadata not received" ||
      message === "metadata not recieved"
    ) {
      return UPLOAD_TOO_LARGE_MESSAGE;
    }
    if (
      error.message.includes("Failed to upload") ||
      error.message.includes("to S3")
    ) {
      return "Upload failed. Please try again or check file size limits.";
    }
    return error.message;
  }
  return "An unknown error occurred during upload";
}
