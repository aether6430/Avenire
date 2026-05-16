"use client";

import { Toaster } from "@avenire/ui/components/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

export function WorkspaceLayoutClientEffects() {
  return (
    <>
      <ServiceWorkerRegistration />
      <Toaster closeButton position="top-right" richColors />
    </>
  );
}
