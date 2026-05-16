"use client";

import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  FileText,
  Folder,
  LinkSimple,
  Plus,
  Upload,
} from "@phosphor-icons/react";
import { FilePlus as FilePlus2 } from "@phosphor-icons/react/FilePlus";

export function ExplorerCreateMenu({
  currentFolderId,
  isCurrentFolderReadOnly,
  isMobile,
  menuSurfaceClass,
  onCreateFolder,
  onCreateNote,
  onImportLink,
  onOpenMobileCreateMenu,
  onUploadFile,
  onUploadFolder,
}: {
  currentFolderId: string;
  isCurrentFolderReadOnly: boolean;
  isMobile: boolean;
  menuSurfaceClass: string;
  onCreateFolder: (folderId: string) => void;
  onCreateNote: (folderId: string) => void;
  onImportLink: (folderId: string) => void;
  onOpenMobileCreateMenu: () => void;
  onUploadFile: () => void;
  onUploadFolder: () => void;
}) {
  if (isMobile) {
    return (
      <Button
        className="rounded-md"
        onClick={onOpenMobileCreateMenu}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <Plus className="size-3.5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className="rounded-md"
            size="icon-sm"
            type="button"
            variant="outline"
          />
        }
      >
        <Plus className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("w-44", menuSurfaceClass)}
      >
        <DropdownMenuItem
          disabled={isCurrentFolderReadOnly}
          onClick={() => onCreateNote(currentFolderId)}
        >
          <FileText className="size-3.5" />
          New note
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isCurrentFolderReadOnly}
          onClick={() => onImportLink(currentFolderId)}
        >
          <LinkSimple className="size-3.5" />
          Import link
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isCurrentFolderReadOnly}
          onClick={() => onCreateFolder(currentFolderId)}
        >
          <Folder className="size-3.5" />
          New folder
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isCurrentFolderReadOnly}
          onClick={onUploadFile}
        >
          <Upload className="size-3.5" />
          Upload file
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isCurrentFolderReadOnly}
          onClick={onUploadFolder}
        >
          <FilePlus2 className="size-3.5" />
          Upload folder
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
