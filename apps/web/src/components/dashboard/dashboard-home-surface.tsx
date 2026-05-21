"use client";

import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { useIsMobile } from "@avenire/ui/hooks/use-mobile";
import { cn } from "@avenire/ui/lib/utils";
import {
  Files,
  FileText,
  ChatText as MessageSquareText,
  Plus,
  Warning as TriangleAlert,
} from "@phosphor-icons/react";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react/BookOpenText";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect } from "react";
import type { DashboardHomeProps } from "@/components/dashboard/dashboard-home-model";
import type { DashboardHomeRuntime } from "@/components/dashboard/use-dashboard-home";
import {
  dashboardUiActions,
  useDashboardUiStore,
} from "@/stores/dashboardUiStore";
import { DashboardHomeColumns } from "./dashboard-home-panels";
import { HeaderBreadcrumbs, HeaderTitle } from "./header-portal";
import { QuickCaptureDialog } from "./quick-capture-dialog";

const DashboardHomeMisconceptionDialog = dynamic(
  () =>
    import("@/components/dashboard/dashboard-home-misconception-dialog").then(
      (module) => ({
        default: module.DashboardHomeMisconceptionDialog,
      })
    ),
  { loading: () => null, ssr: false }
);

const DashboardTaskManager = dynamic(
  () =>
    import("@/components/dashboard/task-manager").then((module) => ({
      default: module.DashboardTaskManager,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 px-4 py-10 text-center text-muted-foreground text-sm">
        <Spinner className="size-4" />
        Loading tasks...
      </div>
    ),
  }
);

const StudentCalendar = dynamic(
  () =>
    import("@/components/student-calendar").then((module) => ({
      default: module.StudentCalendar,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 px-4 py-10 text-center text-muted-foreground text-sm">
        <Spinner className="size-4" />
        Loading calendar...
      </div>
    ),
  }
);

export function DashboardHomeSurface({
  currentUserId,
  runtime,
  weakestDrillTarget,
  workspaceId,
}: Pick<
  DashboardHomeProps,
  "currentUserId" | "weakestDrillTarget" | "workspaceId"
> & {
  runtime: DashboardHomeRuntime;
}) {
  const {
    activeMisconceptions,
    activityLoadFailed,
    activities,
    compactGreeting,
    flashcardSets,
    greeting,
    improveMisconception,
    isCompactPane,
    loadingActivities,
    openChatsWorkspace,
    openFilesWorkspace,
    openFlashcardsWorkspace,
    openMisconceptionFlashcards,
    openMisconceptionTutor,
    resolveMisconception,
    selectedMisconception,
    setSelectedMisconception,
    startReview,
    weakPointGroups,
  } = runtime;
  const homeTab = useDashboardUiStore((state) => state.homeTab);
  const insightsTab = useDashboardUiStore((state) => state.insightsTab);
  const isMobile = useIsMobile();

  useEffect(() => {
    useDashboardUiStore.persist.rehydrate();
  }, []);

  const setHomeDashboardTab = useCallback((value: string) => {
    if (value === "tasks" || value === "activity") {
      dashboardUiActions.setHomeTab(value);
    }
  }, []);

  const setInsightsDashboardTab = useCallback((value: string) => {
    if (
      value === "weak-points" ||
      value === "misconceptions" ||
      value === "upcoming"
    ) {
      dashboardUiActions.setInsightsTab(value);
    }
  }, []);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-background">
      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <HeaderTitle>Workspace</HeaderTitle>
        <HeaderBreadcrumbs>
          <div className="min-w-0">
            <p className="truncate text-muted-foreground text-sm">
              {isMobile ? "Mobile" : "Desktop"}
            </p>
          </div>
        </HeaderBreadcrumbs>

        <div className="-mx-6 overflow-hidden rounded-none md:-mx-12 lg:-mx-16">
          <Image
            alt="Workspace banner"
            className="h-28 w-full object-cover md:h-40"
            height={160}
            src="https://gtgr46laft.ufs.sh/f/7avzGFBuzbjB9vfw3D1PxUaEr7wSqNQiFgMAvYKy35DlcXb0"
            width={2400}
          />
        </div>

        <div className="flex w-full flex-wrap justify-around gap-1.5">
          <QuickCaptureDialog
            currentUserId={currentUserId}
            initialKind="task"
            trigger={
              <Button
                className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground text-sm"
                type="button"
                variant="ghost"
              >
                <Plus className="size-3.5" />
                Task
              </Button>
            }
            workspaceUuid={workspaceId}
          />

          <QuickCaptureDialog
            initialKind="note"
            trigger={
              <Button
                className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground text-sm"
                type="button"
                variant="ghost"
              >
                <FileText className="size-3.5" />
                Note
              </Button>
            }
          />

          <QuickCaptureDialog
            initialKind="misconception"
            trigger={
              <Button
                className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground text-sm"
                type="button"
                variant="ghost"
              >
                <TriangleAlert className="size-3.5" />
                Misconception
              </Button>
            }
          />

          <Button
            className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground text-sm"
            onClick={openChatsWorkspace}
            type="button"
            variant="ghost"
          >
            <MessageSquareText className="size-3.5" />
            New Method
          </Button>

          <Button
            className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground text-sm"
            onClick={openFlashcardsWorkspace}
            type="button"
            variant="ghost"
          >
            <BookOpenCheck className="size-3.5" />
            Mindset Sets
          </Button>

          <Button
            className="h-8 gap-1.5 rounded-md px-2.5 text-muted-foreground text-sm"
            onClick={openFilesWorkspace}
            type="button"
            variant="ghost"
          >
            <Files className="size-3.5" />
            Files
          </Button>
        </div>

        <div className="mt-2 min-w-0">
          <h1
            className={cn(
              "max-w-full truncate text-balance font-semibold text-foreground tracking-tight",
              isCompactPane ? "text-2xl" : "text-3xl"
            )}
          >
            Workspace
          </h1>
          <p
            className={cn(
              "mt-1 max-w-full truncate font-medium text-foreground/90",
              isCompactPane ? "text-sm" : "text-base"
            )}
            title={greeting.headline}
          >
            {isCompactPane ? compactGreeting : greeting.headline}
          </p>
          <p
            className={cn(
              "mt-1 max-w-full truncate text-muted-foreground",
              isCompactPane ? "text-xs" : "text-sm"
            )}
            title={greeting.description}
          >
            {greeting.description}
          </p>
        </div>

        <DashboardHomeColumns
          activeMisconceptions={activeMisconceptions}
          activities={activities}
          activityLoadFailed={activityLoadFailed}
          currentUserId={currentUserId}
          DashboardTaskManager={DashboardTaskManager}
          flashcardSets={flashcardSets}
          homeTab={homeTab}
          insightsTab={insightsTab}
          loadingActivities={loadingActivities}
          onHomeTabChange={setHomeDashboardTab}
          onInsightsTabChange={setInsightsDashboardTab}
          onSelectMisconception={setSelectedMisconception}
          onStartReview={startReview}
          weakestDrillTarget={weakestDrillTarget}
          weakPointGroups={weakPointGroups}
          workspaceId={workspaceId}
        />

        <div className="mt-0">
          <h2 className="mb-3 font-medium text-foreground text-sm">
            Student calendar
          </h2>
          <StudentCalendar />
        </div>
      </div>

      {selectedMisconception ? (
        <DashboardHomeMisconceptionDialog
          misconception={selectedMisconception}
          onClose={() => setSelectedMisconception(null)}
          onImprove={improveMisconception}
          onOpenFlashcards={openMisconceptionFlashcards}
          onOpenTutor={openMisconceptionTutor}
          onResolve={resolveMisconception}
        />
      ) : null}
    </div>
  );
}
