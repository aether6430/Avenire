"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  BookOpen,
  FileText,
  Flask as FlaskConical,
  Upload,
} from "@phosphor-icons/react";
import { AnimatePresence, m } from "motion/react";
import type { UploadPhase } from "./onboarding-modal-model";

export function UploadStep({
  rememberedFileName,
  rememberedUploadAt,
  onOpenFiles,
  onPickUpload,
  uploadMessage,
  uploadName,
  uploadPhase,
}: {
  rememberedFileName: string | null;
  rememberedUploadAt: string | null;
  onOpenFiles: () => void;
  onPickUpload: () => void;
  uploadMessage: string | null;
  uploadName: string | null;
  uploadPhase: UploadPhase;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border/70 bg-background p-5 shadow-black/5 shadow-sm">
        <div className="rounded-2xl border border-border/70 border-dashed bg-muted/20 p-6 text-center">
          <m.div
            animate={
              uploadPhase === "uploading"
                ? { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.95] }
                : { scale: 1, opacity: 1 }
            }
            transition={
              uploadPhase === "uploading"
                ? { duration: 1.1, repeat: Number.POSITIVE_INFINITY }
                : { duration: 0.2 }
            }
          >
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          </m.div>
          <p className="font-medium text-sm">
            {uploadPhase === "uploading"
              ? "Uploading inside onboarding"
              : "Drop a PDF or browse from here"}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            The file stays in flow and lands in your workspace root.
          </p>
          <Button className="mt-4 w-full" onClick={onPickUpload} type="button">
            {uploadPhase === "uploading" ? "Uploading..." : "Upload PDF"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: <FileText className="h-4 w-4" />,
              label: "PDFs",
              sub: "Notes and textbooks",
            },
            {
              icon: <BookOpen className="h-4 w-4" />,
              label: "Images",
              sub: "Handwritten pages",
            },
            {
              icon: <FlaskConical className="h-4 w-4" />,
              label: "Videos",
              sub: "Lecture uploads",
            },
          ].map((item) => (
            <div
              className="rounded-2xl border border-border/70 bg-background px-3 py-3 text-center shadow-black/5 shadow-sm"
              key={item.label}
            >
              <span className="mb-1 flex justify-center text-muted-foreground">
                {item.icon}
              </span>
              <p className="font-medium text-xs">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {rememberedFileName || uploadPhase !== "idle" ? (
            <m.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-border/70 bg-background px-4 py-3 shadow-black/5 shadow-sm"
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Uploaded file
                  </p>
                  <p className="mt-1 truncate font-medium text-foreground text-sm">
                    {uploadName ?? rememberedFileName ?? "Preparing upload"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {uploadMessage ??
                      (rememberedUploadAt
                        ? `Saved locally${rememberedUploadAt ? ` · ${new Date(rememberedUploadAt).toLocaleDateString()}` : ""}`
                        : "Working through the upload pipeline.")}
                  </p>
                </div>
                <Badge className="rounded-md" variant="outline">
                  {uploadPhase === "done"
                    ? "Ready"
                    : uploadPhase === "uploading"
                      ? "Uploading"
                      : rememberedFileName
                        ? "Remembered"
                        : "Queued"}
                </Badge>
              </div>
              {uploadPhase === "uploading" ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <m.div
                    animate={{ x: ["-40%", "120%"] }}
                    className="h-full w-1/3 rounded-full bg-foreground/60"
                    transition={{
                      duration: 1.3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                </div>
              ) : null}
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Button
        className="w-full"
        onClick={onOpenFiles}
        type="button"
        variant="outline"
      >
        Open files workspace
      </Button>
    </div>
  );
}
