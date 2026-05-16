"use client";

import { linkSocial } from "@avenire/auth/app-client";
import { useCallback, useEffect, useState } from "react";
import {
  importNotionPages,
  loadNotionImportPages,
} from "@/components/settings/data-imports-client";
import {
  getDataImportsCallbackUrl,
  type ImportDestination,
  type ImportPage,
  type ImportProviderStatus,
} from "@/components/settings/data-imports-model";

export function useDataImportsNotion({
  ensureSavedDestination,
  loadOverview,
  notionStatus,
}: {
  ensureSavedDestination: () => Promise<ImportDestination>;
  loadOverview: () => Promise<void>;
  notionStatus: ImportProviderStatus | null;
}) {
  const [notionPages, setNotionPages] = useState<ImportPage[]>([]);
  const [selectedNotionPageIds, setSelectedNotionPageIds] = useState<string[]>(
    []
  );
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionImporting, setNotionImporting] = useState(false);
  const [notionImportStatus, setNotionImportStatus] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (notionStatus?.connected && notionStatus.ready) {
      setNotionImportStatus("Notion account connected.");
    }
  }, [notionStatus]);

  const selectedPagesCount = selectedNotionPageIds.length;

  const connectNotion = useCallback(async () => {
    setNotionImportStatus("Redirecting to Notion...");
    await linkSocial({
      callbackURL: getDataImportsCallbackUrl(),
      provider: "notion",
    });
  }, []);

  const handleLoadNotionPages = useCallback(async () => {
    setNotionLoading(true);
    setNotionImportStatus("Loading Notion pages...");

    try {
      const pages = await loadNotionImportPages();
      setNotionPages(pages);
      setSelectedNotionPageIds([]);
      setNotionImportStatus(
        pages.length
          ? "Choose pages to import."
          : "No importable Notion pages were found."
      );
    } catch (error) {
      setNotionImportStatus(
        error instanceof Error ? error.message : "Unable to load Notion pages."
      );
    } finally {
      setNotionLoading(false);
    }
  }, []);

  const toggleNotionPage = useCallback((pageId: string) => {
    setSelectedNotionPageIds((current) =>
      current.includes(pageId)
        ? current.filter((entry) => entry !== pageId)
        : [...current, pageId]
    );
  }, []);

  const handleImportSelectedNotionPages = useCallback(async () => {
    if (selectedNotionPageIds.length === 0) {
      setNotionImportStatus("Select at least one Notion page.");
      return;
    }

    setNotionImporting(true);
    setNotionImportStatus("Importing selected Notion pages...");

    try {
      await ensureSavedDestination();
      const imported = await importNotionPages(selectedNotionPageIds);
      setNotionImportStatus(
        `Imported ${imported.length} Notion page${imported.length === 1 ? "" : "s"}.`
      );
      await loadOverview();
    } catch (error) {
      setNotionImportStatus(
        error instanceof Error ? error.message : "Unable to import pages."
      );
    } finally {
      setNotionImporting(false);
    }
  }, [ensureSavedDestination, loadOverview, selectedNotionPageIds]);

  return {
    connectNotion,
    handleImportSelectedNotionPages,
    handleLoadNotionPages,
    notionImportStatus,
    notionImporting,
    notionLoading,
    notionPages,
    selectedNotionPageIds,
    selectedPagesCount,
    toggleNotionPage,
  };
}
