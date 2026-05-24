import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const removedOverviewSidebarSyncFile = resolve(
  import.meta.dirname,
  "./overview-sidebar-sync.tsx"
);
const removedDashboardHomeWrapperFile = resolve(
  import.meta.dirname,
  "./dashboard-home.tsx"
);
const workspaceOverviewPageClientSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-overview-page-client.tsx"),
  "utf8"
);

describe("DashboardHome", () => {
  it("keeps the old dashboard-home wrapper removed and wires overview directly into the surface owner", () => {
    expect(existsSync(removedOverviewSidebarSyncFile)).toBe(false);
    expect(existsSync(removedDashboardHomeWrapperFile)).toBe(false);
    expect(workspaceOverviewPageClientSource).toContain("useDashboardHome");
    expect(workspaceOverviewPageClientSource).toContain(
      "@/components/dashboard/dashboard-home-surface"
    );
    expect(workspaceOverviewPageClientSource).not.toContain(
      '@/components/dashboard/dashboard-home"'
    );
  });
});
