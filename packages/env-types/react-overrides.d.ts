/// <reference types="react" />

import type {} from "@phosphor-icons/react";
import type {} from "@phosphor-icons/react/ssr";

declare module "@phosphor-icons/react" {
  interface IconProps {
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
    strokeWidth?: number;
  }
}

declare module "@phosphor-icons/react/ssr" {
  interface IconProps {
    "aria-hidden"?: boolean | "true" | "false";
    className?: string;
    strokeWidth?: number;
  }
}
