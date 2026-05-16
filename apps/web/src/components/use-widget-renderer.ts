"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";
import {
  buildCssVarBlock,
  buildIframeDocument,
  extractThemeVars,
} from "@/components/widget-renderer-model";

export function useWidgetRenderer({
  html,
  onOpenLink,
  onSendMessage,
  runScripts = true,
}: {
  html: string;
  onOpenLink?: (url: string) => void;
  onSendMessage?: (text: string) => void;
  runScripts?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const autoHeightRef = useRef<number>(320);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isReadyRef = useRef(false);

  const postToIframe = useCallback((data: Record<string, unknown>) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      return;
    }
    iframe.contentWindow.postMessage(data, "*");
  }, []);

  const writeCssVars = useCallback(() => {
    const vars = extractThemeVars();
    const cssVarBlock = buildCssVarBlock(vars);
    postToIframe({ cssText: cssVarBlock, type: "avenire:setCssVars" });
  }, [postToIframe]);

  const writeContent = useCallback(
    (nextHtml: string, shouldRunScripts: boolean) => {
      postToIframe({
        html: nextHtml,
        runScripts: shouldRunScripts,
        type: "avenire:setContent",
      });
    },
    [postToIframe]
  );

  const initIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const vars = extractThemeVars();
    const cssVarBlock = buildCssVarBlock(vars);
    const doc = buildIframeDocument(cssVarBlock, isDark);
    iframe.srcdoc = doc;
  }, [isDark]);

  useEffect(() => {
    initIframe();
  }, [initIframe]);

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }
    writeCssVars();
  }, [writeCssVars]);

  useEffect(() => {
    if (!isReadyRef.current) {
      return;
    }
    writeContent(html, runScripts);
  }, [html, runScripts, writeContent]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!iframeRef.current) {
        return;
      }
      if (event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const { type, text, url, height } = event.data ?? {};

      if (type === "avenire:sendMessage" && text && onSendMessage) {
        onSendMessage(text);
      }
      if (type === "avenire:openLink" && url && onOpenLink) {
        onOpenLink(url);
      }
      if (type === "avenire:resize" && typeof height === "number") {
        autoHeightRef.current = Math.max(80, height + 2);
        if (iframeRef.current) {
          iframeRef.current.style.height = `${autoHeightRef.current}px`;
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSendMessage, onOpenLink]);

  const handleLoad = useCallback(() => {
    isReadyRef.current = true;
    writeCssVars();
    writeContent(html, runScripts);
  }, [html, runScripts, writeContent, writeCssVars]);

  return {
    autoHeightRef,
    handleLoad,
    iframeRef,
  };
}
