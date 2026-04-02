import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { watch } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(currentDir, "..");
const srcDir = join(rootDir, "src");
const distDir = join(rootDir, "dist");
const webBrandingDir = resolve(rootDir, "..", "web", "public", "branding");
const isWatch = process.argv.includes("--watch");

const appOrigins = (process.env.AVENIRE_EXTENSION_APP_ORIGINS ??
  "https://avenire.space,http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function copySource() {
  await rm(distDir, { force: true, recursive: true });
  await mkdir(distDir, { recursive: true });
  await cp(srcDir, distDir, { recursive: true });
  await cp(join(webBrandingDir, "avenire-logo-mark.svg"), join(distDir, "avenire-logo-mark.svg"));
  await cp(join(webBrandingDir, "avenire-logo-full.png"), join(distDir, "avenire-logo-full.png"));

  const manifest = {
    manifest_version: 3,
    name: "Avenire Web Clipper",
    version: "0.1.0",
    description: "Clip highlighted or selected web content into Avenire.",
    permissions: ["activeTab", "scripting", "storage", "tabs"],
    host_permissions: Array.from(
      new Set(["<all_urls>", ...appOrigins.map((origin) => `${origin}/*`)])
    ),
    action: {
      default_popup: "popup.html",
      default_icon: {
        16: "avenire-logo-full.png",
        48: "avenire-logo-full.png",
        128: "avenire-logo-full.png",
      },
    },
    options_ui: {
      page: "options.html",
      open_in_tab: true,
    },
    background: {
      service_worker: "background.js",
    },
    icons: {
      16: "avenire-logo-full.png",
      48: "avenire-logo-full.png",
      128: "avenire-logo-full.png",
    },
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["content.js"],
        run_at: "document_idle",
      },
    ],
  };

  await writeFile(
    join(distDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
}

async function bundleScripts() {
  await esbuild({
    entryPoints: {
      background: join(srcDir, "background.js"),
      content: join(srcDir, "content.js"),
      options: join(srcDir, "options.js"),
      popup: join(srcDir, "popup.js"),
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome120",
    outdir: distDir,
    sourcemap: false,
    logLevel: "silent",
  });
}

async function build() {
  await copySource();
  await bundleScripts();
  const readmePath = join(rootDir, "README.md");
  if (await pathExists(readmePath)) {
    const readme = await readFile(readmePath, "utf8");
    await writeFile(join(distDir, "README.txt"), readme, "utf8");
  }
  console.log("[extension] build complete");
}

await build();

if (isWatch) {
  watch(srcDir, { recursive: true }, async () => {
    try {
      await build();
    } catch (error) {
      console.error("[extension] build failed", error);
    }
  });
}
