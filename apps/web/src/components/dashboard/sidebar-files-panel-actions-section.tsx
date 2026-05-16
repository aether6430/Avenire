"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
} from "@avenire/ui/components/sidebar";
import { LinkSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { FilePlus as FilePlus2 } from "@phosphor-icons/react/FilePlus";
import {
  SectionButton,
  SectionHeader,
  SectionIconAction,
} from "./dashboard-sidebar-shared";

export function SidebarFilesPanelActionsSection({
  createNewNote,
  importLink,
  onToggleSearch,
}: {
  createNewNote: () => void;
  importLink: () => void;
  onToggleSearch: () => void;
}) {
  return (
    <SidebarGroup>
      <SectionHeader
        actions={
          <>
            <SectionIconAction
              icon={MagnifyingGlass}
              label="Search Files"
              onClick={onToggleSearch}
            />
            <SectionIconAction
              icon={FilePlus2}
              label="New Note"
              onClick={createNewNote}
            />
          </>
        }
        title="Files"
      />
      <SidebarGroupContent>
        <div className="space-y-1">
          <SectionButton
            icon={FilePlus2}
            label="New Note"
            onClick={createNewNote}
          />
          <SectionButton
            icon={LinkSimple}
            label="Import Link"
            onClick={importLink}
          />
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
