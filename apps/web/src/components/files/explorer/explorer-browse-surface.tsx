"use client";

import { ExplorerBrowseCards } from "./explorer-browse-cards";
import { ExplorerBrowseList } from "./explorer-browse-list";
import type { ExplorerBrowseSurfaceProps } from "./explorer-browse-surface-types";

export function ExplorerBrowseSurface(props: ExplorerBrowseSurfaceProps) {
  return (
    <>
      <ExplorerBrowseCards {...props} />
      <ExplorerBrowseList {...props} />
    </>
  );
}
