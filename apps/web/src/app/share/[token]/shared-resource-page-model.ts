export type SharedResourcePageResourceType = "chat" | "file" | "folder";

export function getSharedResourceMissingPageTitle() {
  return "This page isn't here.";
}

export function getSharedResourceTitle(
  resourceType: SharedResourcePageResourceType
): string {
  switch (resourceType) {
    case "chat":
      return "Shared method";
    case "file":
      return "Shared file";
    case "folder":
      return "Shared folder";
  }
}

export function getSharedResourcePageHeading(input: {
  hasAccess: boolean;
  resourceType: SharedResourcePageResourceType;
}): string {
  if (!input.hasAccess) {
    return "Access denied";
  }

  return getSharedResourceTitle(input.resourceType);
}
