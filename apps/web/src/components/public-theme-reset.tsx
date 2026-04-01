"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PublicThemeReset() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;

    if (pathname.startsWith("/workspace")) {
      root.classList.remove("landing-light-scope");
      root.style.colorScheme = "";
      return;
    }

    root.classList.add("landing-light-scope");
    root.classList.remove("dark");
    root.removeAttribute("data-theme");
    root.style.colorScheme = "light";
  }, [pathname]);

  return null;
}
