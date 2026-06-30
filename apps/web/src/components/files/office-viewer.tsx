"use client";

import {
  DocxEditorViewer,
  useDocxEditor,
  type DocxEditorController,
} from "@extend-ai/react-docx";
import {
  XlsxViewer,
  useXlsxViewerController,
} from "@extend-ai/react-xlsx";
import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@avenire/ui/components/tabs";
import { cn } from "@avenire/ui/lib/utils";
import { DownloadSimple, FileText } from "@phosphor-icons/react";
import {
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChunkingConfig,
  OfficeChunk,
  OfficeParserAST,
  SupportedFileType,
} from "officeparser/slim";
import {
  DocumentViewerDock,
  useScrollActivatedDock,
} from "@/components/files/document-viewer-dock";

type OfficeViewerKind = "document" | "presentation" | "spreadsheet";
type PreviewSection = {
  id: string;
  title: string;
  text: string;
};

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const supportedParserTypes = new Set<SupportedFileType>([
  "csv",
  "docx",
  "html",
  "md",
  "odp",
  "ods",
  "odt",
  "pptx",
  "rtf",
  "xlsx",
]);
const documentParserHints = new Map<string, SupportedFileType>([
  ["docx", "docx"],
  ["odm", "odt"],
  ["odt", "odt"],
  ["ott", "odt"],
  ["rtf", "rtf"],
]);
const presentationParserHints = new Map<string, SupportedFileType>([
  ["odp", "odp"],
  ["otp", "odp"],
  ["pptx", "pptx"],
]);
const spreadsheetParserHints = new Map<string, SupportedFileType>([
  ["csv", "csv"],
  ["ods", "ods"],
  ["ots", "ods"],
  ["xlsx", "xlsx"],
]);

function fileNameFromSource(source: string, fallback: string) {
  const pathname = source.split(/[?#]/)[0] ?? "";
  const rawName = pathname.split("/").pop() || fallback;

  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

function getExtension(fileName: string | undefined, source: string) {
  const name = (fileName || fileNameFromSource(source, "")).toLowerCase();
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension : "";
}

function parserHintForFile(input: {
  fileName?: string;
  kind: OfficeViewerKind;
  source: string;
}) {
  const extension = getExtension(input.fileName, input.source);
  if (input.kind === "presentation") {
    return presentationParserHints.get(extension) ?? null;
  }
  if (input.kind === "spreadsheet") {
    return spreadsheetParserHints.get(extension) ?? null;
  }
  return documentParserHints.get(extension) ?? null;
}

function isDocxPreviewFile(fileName: string | undefined, source: string) {
  return getExtension(fileName, source) === "docx";
}

function isWorkbookPreviewFile(fileName: string | undefined, source: string) {
  const extension = getExtension(fileName, source);
  return extension === "csv" || extension === "xlsx";
}

function chunkingConfigForType(type: OfficeParserAST["type"]): ChunkingConfig {
  if (type === "pptx" || type === "odp") {
    return {
      addStartIndex: true,
      includeMetadata: true,
      maxChunkSize: 1800,
      splitBy: "slide",
      strategy: "document-structure",
      tableSplitStrategy: "row",
    };
  }

  if (type === "xlsx" || type === "ods" || type === "csv") {
    return {
      addStartIndex: true,
      includeMetadata: true,
      maxChunkSize: 1800,
      splitBy: "sheet",
      strategy: "document-structure",
      tableSplitStrategy: "row",
    };
  }

  return {
    addStartIndex: true,
    includeMetadata: true,
    maxChunkSize: 1800,
    splitBy: "heading",
    strategy: "document-structure",
    tableSplitStrategy: "row",
  };
}

function normalizePreviewText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function sectionTitleForChunk(chunk: OfficeChunk, fallbackIndex: number) {
  const metadata = chunk.metadata;
  if (typeof metadata.slideNumber === "number") {
    return `Slide ${metadata.slideNumber}`;
  }
  if (typeof metadata.sheetName === "string" && metadata.sheetName.trim()) {
    return metadata.sheetName.trim();
  }
  if (typeof metadata.pageNumber === "number") {
    return `Page ${metadata.pageNumber}`;
  }
  if (
    typeof metadata.closestHeading === "string" &&
    metadata.closestHeading.trim()
  ) {
    return metadata.closestHeading.trim();
  }
  return `Section ${fallbackIndex + 1}`;
}

function sectionsFromChunks(chunks: OfficeChunk[]) {
  return chunks
    .map((chunk, index): PreviewSection | null => {
      const text = normalizePreviewText(chunk.text);
      if (!text) {
        return null;
      }
      const title = sectionTitleForChunk(chunk, index);
      return {
        id: `${index}-${title}`,
        text,
        title,
      };
    })
    .filter((section): section is PreviewSection => section !== null);
}

function sectionsFromText(text: string): PreviewSection[] {
  const normalized = normalizePreviewText(text);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\n{3,}/)
    .map((sectionText) => normalizePreviewText(sectionText))
    .filter(Boolean)
    .map((sectionText, index) => ({
      id: `fallback-${index}`,
      text: sectionText,
      title: `Section ${index + 1}`,
    }));
}

function scrollDocxPageIntoView({
  page,
  totalPages,
  viewport,
}: {
  page: number;
  totalPages: number;
  viewport: HTMLDivElement | null;
}) {
  if (!viewport || totalPages <= 1) {
    return;
  }

  const ratio = (Math.max(1, Math.min(totalPages, page)) - 1) / totalPages;
  viewport.scrollTo({
    behavior: "smooth",
    top: ratio * viewport.scrollHeight,
  });
}

function DocxPreview({
  fileName,
  source,
}: {
  fileName?: string;
  source: string;
}) {
  const editor = useDocxEditor();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const importDocxFileRef = useRef<DocxEditorController["importDocxFile"]>(
    editor.importDocxFile
  );
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dockVisible = useScrollActivatedDock(
    viewportRef,
    !editor.isImporting && !editor.importError
  );

  useEffect(() => {
    importDocxFileRef.current = editor.importDocxFile;
  }, [editor.importDocxFile]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);

    async function load() {
      try {
        const response = await fetch(source, {
          cache: "force-cache",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Unable to load document (${response.status})`);
        }

        const blob = await response.blob();
        const docxFile = new File(
          [blob],
          fileName ?? fileNameFromSource(source, "document.docx"),
          { type: blob.type || DOCX_MIME_TYPE }
        );
        await importDocxFileRef.current(docxFile);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Unable to load document."
        );
      }
    }

    void load();

    return () => controller.abort();
  }, [fileName, source]);

  const currentPage = Math.max(1, editor.currentPage || 1);
  const totalPages = Math.max(1, editor.totalPages || 1);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-muted/30">
      <div ref={viewportRef} className="h-full min-h-0 overflow-auto px-3 py-3">
        {editor.isImporting ? (
          <div className="grid h-full min-h-[55vh] place-items-center text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Loading document...
            </span>
          </div>
        ) : loadError || editor.importError ? (
          <DocumentFallback
            message={loadError ?? editor.importError?.message}
            source={source}
          />
        ) : (
          <div
            className="mx-auto origin-top"
            style={{
              transform: `scale(${zoom})`,
              width: `${100 / zoom}%`,
            }}
          >
            <DocxEditorViewer
              className="mx-auto min-h-full"
              editor={editor}
              mode="read-only"
              pageGapBackgroundColor="transparent"
              pageVirtualization={{ enabled: true, overscan: 2 }}
            />
          </div>
        )}
      </div>
      <DocumentViewerDock
        currentPage={currentPage}
        isVisible={dockVisible}
        maxZoom={2.5}
        minZoom={0.5}
        onNextPage={() =>
          scrollDocxPageIntoView({
            page: currentPage + 1,
            totalPages,
            viewport: viewportRef.current,
          })
        }
        onPageChange={(page) =>
          scrollDocxPageIntoView({
            page,
            totalPages,
            viewport: viewportRef.current,
          })
        }
        onPreviousPage={() =>
          scrollDocxPageIntoView({
            page: currentPage - 1,
            totalPages,
            viewport: viewportRef.current,
          })
        }
        onZoomChange={setZoom}
        totalPages={totalPages}
        zoom={zoom}
      />
    </div>
  );
}

function ExtractedOfficePreview({
  fileName,
  kind,
  source,
}: {
  fileName?: string;
  kind: OfficeViewerKind;
  source: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sections, setSections] = useState<PreviewSection[]>([]);
  const [zoom, setZoom] = useState(1);
  const dockVisible = useScrollActivatedDock(viewportRef, !isLoading);
  const parserHint = parserHintForFile({ fileName, kind, source });

  useEffect(() => {
    const controller = new AbortController();
    setActiveSection(0);
    setIsLoading(true);
    setLoadError(null);
    setSections([]);

    async function load() {
      try {
        if (!parserHint || !supportedParserTypes.has(parserHint)) {
          throw new Error("In-app preview is unavailable for this file type.");
        }

        const response = await fetch(source, {
          cache: "force-cache",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Unable to load document (${response.status})`);
        }

        const fileBuffer = new Uint8Array(await response.arrayBuffer());
        const { OfficeParser } = await import("officeparser/slim");
        const ast = await OfficeParser.parseOffice(fileBuffer, {
          abortSignal: controller.signal,
          fileType: parserHint,
          ignoreComments: false,
          ignoreNotes: false,
          newlineDelimiter: "\n",
        });
        const generated = await ast.to("chunks", {
          chunksConfig: chunkingConfigForType(ast.type),
        });
        const chunkSections = Array.isArray(generated.value)
          ? sectionsFromChunks(generated.value as OfficeChunk[])
          : [];
        const nextSections =
          chunkSections.length > 0
            ? chunkSections
            : sectionsFromText(ast.toText());

        if (nextSections.length === 0) {
          throw new Error("No readable preview text was found in this file.");
        }
        setSections(nextSections);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to preview this document."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [parserHint, source]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || sections.length <= 1) {
      return;
    }

    const updateActiveSection = () => {
      const viewportTop = node.getBoundingClientRect().top;
      let nextActive = 0;
      for (const [index, section] of sectionRefs.current.entries()) {
        if (!section) {
          continue;
        }
        const offset = section.getBoundingClientRect().top - viewportTop;
        if (offset <= 120) {
          nextActive = index;
        }
      }
      setActiveSection(nextActive);
    };

    updateActiveSection();
    node.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => node.removeEventListener("scroll", updateActiveSection);
  }, [sections.length]);

  const scrollToSection = useCallback(
    (page: number) => {
      const nextIndex = Math.min(
        Math.max(Math.round(page) - 1, 0),
        Math.max(sections.length - 1, 0)
      );
      sectionRefs.current[nextIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      setActiveSection(nextIndex);
    },
    [sections.length]
  );

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-muted/30">
      <div ref={viewportRef} className="h-full min-h-0 overflow-auto px-3 py-3">
        {isLoading ? (
          <div className="grid h-full min-h-[55vh] place-items-center text-muted-foreground text-sm">
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Loading document...
            </span>
          </div>
        ) : loadError ? (
          <DocumentFallback message={loadError} source={source} />
        ) : (
          <div
            className="mx-auto flex max-w-[920px] origin-top flex-col gap-3 pb-16"
            style={{
              transform: `scale(${zoom})`,
              width: `${100 / zoom}%`,
            }}
          >
            {sections.map((section, index) => (
              <article
                className="min-h-[360px] rounded-lg border border-border/70 bg-background px-7 py-6 shadow-sm sm:px-10 sm:py-8"
                key={section.id}
                ref={(node) => {
                  sectionRefs.current[index] = node;
                }}
              >
                <div className="mb-5 flex items-center justify-between gap-3 border-border/60 border-b pb-3">
                  <h2 className="truncate font-medium text-foreground text-sm">
                    {section.title}
                  </h2>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {index + 1} / {sections.length}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words font-serif text-[15px] text-foreground leading-7">
                  {section.text}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <DocumentViewerDock
        currentPage={activeSection + 1}
        isVisible={dockVisible}
        maxZoom={2.5}
        minZoom={0.5}
        onNextPage={() => scrollToSection(activeSection + 2)}
        onPageChange={scrollToSection}
        onPreviousPage={() => scrollToSection(activeSection)}
        onZoomChange={setZoom}
        pageLabel="Section number"
        totalPages={sections.length || 1}
        zoom={zoom}
      />
    </div>
  );
}

function WorkbookPreview({
  fileName,
  source,
}: {
  fileName?: string;
  source: string;
}) {
  const controller = useXlsxViewerController({
    fileName: fileName ?? fileNameFromSource(source, "workbook.xlsx"),
    readOnly: true,
    readOnlyAboveBytes: 0,
    showHiddenSheets: false,
    src: source,
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dockVisible = useScrollActivatedDock(viewportRef, !controller.isLoading);
  const sheetValue = useMemo(
    () => String(controller.activeTabIndex),
    [controller.activeTabIndex]
  );

  const renderScroller = useCallback(
    ({
      children,
      viewportProps,
    }: {
      children: ReactNode;
      viewportProps: HTMLAttributes<HTMLDivElement> & {
        ref: Ref<HTMLDivElement>;
        style: CSSProperties;
        tabIndex: number;
      };
    }) => (
      <div
        {...viewportProps}
        ref={(node) => {
          viewportRef.current = node;
          const { ref } = viewportProps;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as RefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className={cn("h-full min-h-0 overflow-auto", viewportProps.className)}
      >
        {children}
      </div>
    ),
    []
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
      {controller.tabs.length > 0 ? (
        <div className="flex min-h-10 items-center border-border border-b bg-background px-2">
          <Tabs
            onValueChange={(value) => {
              const index = Number(value);
              if (Number.isInteger(index)) {
                controller.setActiveTabIndex(index);
              }
            }}
            value={sheetValue}
          >
            <TabsList className="h-8">
              {controller.tabs.map((tab, index) => (
                <TabsTrigger
                  className="h-7 max-w-44 truncate px-3 text-xs"
                  key={`${tab.kind}-${index}-${tab.name}`}
                  value={String(index)}
                >
                  {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <XlsxViewer
          controller={controller}
          emptyState={<DocumentFallback source={source} />}
          errorState={(error) => (
            <DocumentFallback message={error.message} source={source} />
          )}
          experimentalCanvas
          loadingState={
            <div className="grid h-full min-h-[55vh] place-items-center text-muted-foreground text-sm">
              <span className="inline-flex items-center gap-2">
                <Spinner className="size-4" />
                Loading workbook...
              </span>
            </div>
          }
          readOnly
          renderScroller={renderScroller}
          rounded={false}
          showDefaultToolbar={false}
          toolbar={null}
        />
      </div>
      <DocumentViewerDock
        currentPage={controller.activeTabIndex + 1}
        isVisible={dockVisible}
        maxZoom={controller.maxZoomScale / 100}
        minZoom={controller.minZoomScale / 100}
        onZoomChange={(nextZoom) =>
          controller.setZoomScale(Math.round(nextZoom * 100))
        }
        pageLabel="Sheet number"
        totalPages={controller.tabs.length}
        zoom={controller.zoomScale / 100}
      />
    </div>
  );
}

function DocumentFallback({
  message = "In-app preview is unavailable for this file type.",
  source,
}: {
  message?: string;
  source: string;
}) {
  return (
    <div className="flex h-full min-h-[55vh] flex-col items-center justify-center gap-3 bg-card p-4 text-center">
      <FileText className="size-8 text-muted-foreground" />
      <p className="max-w-md text-muted-foreground text-xs">{message}</p>
      <Button
        onClick={() => window.open(source, "_blank", "noopener,noreferrer")}
        size="sm"
        type="button"
        variant="outline"
      >
        <DownloadSimple className="mr-1 size-3.5" />
        Open file
      </Button>
    </div>
  );
}

export default function OfficeViewer({
  className,
  fileName,
  kind,
  source,
}: {
  className?: string;
  fileName?: string;
  kind: OfficeViewerKind;
  source: string;
}) {
  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden rounded-none border-0 bg-background sm:rounded-xl sm:border sm:border-border/70",
        className
      )}
    >
      {kind === "document" && isDocxPreviewFile(fileName, source) ? (
        <DocxPreview fileName={fileName} source={source} />
      ) : kind === "spreadsheet" && isWorkbookPreviewFile(fileName, source) ? (
        <WorkbookPreview fileName={fileName} source={source} />
      ) : parserHintForFile({ fileName, kind, source }) ? (
        <ExtractedOfficePreview fileName={fileName} kind={kind} source={source} />
      ) : (
        <DocumentFallback source={source} />
      )}
    </div>
  );
}
