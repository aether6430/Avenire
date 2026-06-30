import type { ComponentType } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const TREE_FILE_ICON_SRC_BY_EXTENSION: Record<string, string> = {
  astro: "/icons/astro.svg",
  avif: "/icons/image.svg",
  bmp: "/icons/image.svg",
  c: "/icons/c.svg",
  cpp: "/icons/cpp.svg",
  css: "/icons/css.svg",
  csv: "/icons/csv.svg",
  gif: "/icons/image.svg",
  go: "/icons/go.svg",
  html: "/icons/html.svg",
  ico: "/icons/image.svg",
  java: "/icons/java.svg",
  jpeg: "/icons/image.svg",
  jpg: "/icons/image.svg",
  js: "/icons/javascript.svg",
  json: "/icons/json.svg",
  jsx: "/icons/react.svg",
  m4a: "/icons/audio.svg",
  markdown: "/icons/markdown.svg",
  md: "/icons/markdown.svg",
  mkv: "/icons/video.svg",
  mov: "/icons/video.svg",
  mp3: "/icons/audio.svg",
  mp4: "/icons/video.svg",
  pdf: "/icons/pdf.svg",
  php: "/icons/php.svg",
  png: "/icons/image.svg",
  py: "/icons/python.svg",
  rb: "/icons/ruby.svg",
  rs: "/icons/rust.svg",
  scss: "/icons/scss.svg",
  sql: "/icons/database.svg",
  svg: "/icons/svg.svg",
  tar: "/icons/zip.svg",
  ts: "/icons/typescript.svg",
  tsx: "/icons/react-typescript.svg",
  txt: "/icons/text.svg",
  wav: "/icons/audio.svg",
  webm: "/icons/video.svg",
  webp: "/icons/image.svg",
  xls: "/icons/csv.svg",
  xlsx: "/icons/csv.svg",
  xml: "/icons/xml.svg",
  yaml: "/icons/yaml.svg",
  yml: "/icons/yaml.svg",
  zip: "/icons/zip.svg",
};

const treeFileIconComponentCache = new Map<
  string,
  ComponentType<{ className?: string }>
>();

export function TreeIconImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className?: string;
  src: string;
}) {
  return (
    <Image
      alt={alt}
      aria-hidden="true"
      className={className}
      height={16}
      src={src}
      unoptimized
      width={16}
    />
  );
}

export function TreeFolderClosedIcon({ className }: { className?: string }) {
  return (
    <TreeIconImage alt="" className={className} src="/icons/_folder.svg" />
  );
}

export function TreeFolderOpenIcon({ className }: { className?: string }) {
  return (
    <TreeIconImage alt="" className={className} src="/icons/_folder_open.svg" />
  );
}

export function getTreeFileIconSrc(name: string) {
  const ext = name.includes(".")
    ? (name.split(".").pop()?.toLowerCase() ?? "")
    : "";
  return TREE_FILE_ICON_SRC_BY_EXTENSION[ext] ?? "/icons/_file.svg";
}

export function getTreeFileIconComponent(name: string) {
  const iconSrc = getTreeFileIconSrc(name);
  const cached = treeFileIconComponentCache.get(iconSrc);
  if (cached) {
    return cached;
  }

  const TreeFileIcon = ({ className }: { className?: string }) => (
    <TreeIconImage
      alt=""
      className={cn("size-4 shrink-0", className)}
      src={iconSrc}
    />
  );
  TreeFileIcon.displayName = `TreeFileIcon(${iconSrc})`;
  treeFileIconComponentCache.set(iconSrc, TreeFileIcon);
  return TreeFileIcon;
}
