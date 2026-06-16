"use client";

import { Check, Copy, XLogo, LinkedinLogo } from "@phosphor-icons/react/ssr";
import type { ElementType } from "react";
import { useState } from "react";

const CopyIcon = Copy as ElementType;
const CheckIcon = Check as ElementType;
const XLogoIcon = XLogo as ElementType;
const LinkedinLogoIcon = LinkedinLogo as ElementType;

export function ShareActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const shareLinks = [
    {
      label: "Copy link",
      icon: copied ? CheckIcon : CopyIcon,
      onClick: copyLink,
      className: copied
        ? "text-green-400 border-green-400/30"
        : "text-white/60 hover:text-white hover:border-white/30",
    },
    {
      label: "Share on X",
      icon: XLogoIcon,
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      className: "text-white/60 hover:text-white hover:border-white/30",
    },
    {
      label: "Share on LinkedIn",
      icon: LinkedinLogoIcon,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      className: "text-white/60 hover:text-white hover:border-white/30",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/30 uppercase tracking-widest">
        Share this article
      </p>
      <div className="flex flex-wrap gap-2">
        {shareLinks.map((link) => {
          const Icon = link.icon;

          if ("onClick" in link) {
            return (
              <button
                className={`inline-flex items-center gap-2 rounded-lg border border-divide bg-white/5 px-3.5 py-2 text-xs font-medium transition-all ${link.className}`}
                key={link.label}
                onClick={link.onClick}
                type="button"
              >
                <Icon className="size-4" />
                {link.label}
              </button>
            );
          }

          return (
            <a
              className={`inline-flex items-center gap-2 rounded-lg border border-divide bg-white/5 px-3.5 py-2 text-xs font-medium transition-all ${link.className}`}
              href={link.href}
              key={link.label}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icon className="size-4" />
              {link.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
