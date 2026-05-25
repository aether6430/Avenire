"use client";

import { useEffect, useRef, useState } from "react";

import {
  fetchRevisionData,
  fetchUpcomingTasks,
  type RevisionData,
  resolveStudentCalendarRevisionDataError,
  resolveStudentCalendarUpcomingTasksError,
  type UpcomingTask,
} from "@/components/student-calendar-model";

export function useStudentCalendarDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export function useStudentCalendarActivation<
  TElement extends HTMLElement = HTMLDivElement,
>() {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<TElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return { containerRef, isActive };
}

export function useStudentCalendarUpcomingTasks() {
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tasksLoadedRef = useRef(false);
  const tasksRequestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const loadTasks = (background = false) => {
      if (tasksRequestRef.current) {
        return tasksRequestRef.current;
      }

      tasksRequestRef.current = (async () => {
        try {
          const nextTasks = await fetchUpcomingTasks();
          tasksLoadedRef.current = true;
          setUpcomingTasks(nextTasks);
          setError(null);
        } catch (error) {
          if (!(background || tasksLoadedRef.current)) {
            setUpcomingTasks([]);
            setError(resolveStudentCalendarUpcomingTasksError(error));
          }
        } finally {
          tasksRequestRef.current = null;
        }
      })();

      return tasksRequestRef.current;
    };

    loadTasks().catch(() => undefined);

    const refresh = () => loadTasks(true).catch(() => undefined);
    window.addEventListener("dashboard.tasks.refresh", refresh);
    return () => window.removeEventListener("dashboard.tasks.refresh", refresh);
  }, []);

  return { upcomingTasks, error };
}

interface StudentCalendarRangeDataParams {
  active: boolean;
  fromKey: string;
  rangeKey: string;
  toKey: string;
}

export function useStudentCalendarRangeData({
  active,
  fromKey,
  rangeKey,
  toKey,
}: StudentCalendarRangeDataParams) {
  const [data, setData] = useState<RevisionData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, RevisionData>>(new Map());

  useEffect(() => {
    if (!active) {
      return;
    }

    const cached = cacheRef.current.get(rangeKey);
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchRevisionData(
          fromKey,
          toKey,
          controller.signal
        );
        cacheRef.current.set(rangeKey, nextData);
        setData(nextData);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(resolveStudentCalendarRevisionDataError(err));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [active, fromKey, rangeKey, toKey]);

  return { data, error, loading };
}
