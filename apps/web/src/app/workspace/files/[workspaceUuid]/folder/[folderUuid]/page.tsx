import type { Metadata } from "next";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import { buildPageMetadata } from "@/lib/page-metadata";
export const metadata: Metadata = buildPageMetadata({
  noIndex: true,
  title: "Files",
});

export default function WorkspaceFolderPage() {
  return <WorkspaceFolderRoutePageClient />;
}
