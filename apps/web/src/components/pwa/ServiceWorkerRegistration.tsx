"use client";

import { useEffect } from "react";

function isLocalWorkspaceHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const clearLocalServiceWorkers = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );

      if (typeof window === "undefined" || !("caches" in window)) {
        return;
      }

      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("avenire-"))
          .map((cacheName) => window.caches.delete(cacheName))
      );
    };

    if (isLocalWorkspaceHost(window.location.hostname)) {
      clearLocalServiceWorkers().catch((error) => {
        console.error("Local service worker cleanup failed:", error);
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, []);

  return null;
}
