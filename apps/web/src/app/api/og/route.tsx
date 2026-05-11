import { STATIC_ASSETS } from "@/lib/static-assets";

export const runtime = "edge";

const DEFAULT_TITLE = "Avenire";
const DEFAULT_DESCRIPTION = "Learn with context";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTitle = url.searchParams.get("title") ?? DEFAULT_TITLE;
  const rawDescription =
    url.searchParams.get("description") ?? DEFAULT_DESCRIPTION;
  const title = escapeXml(rawTitle.trim().slice(0, 96) || DEFAULT_TITLE);
  const description = escapeXml(
    rawDescription.trim().slice(0, 80) || DEFAULT_DESCRIPTION
  );
  const origin = url.origin;
  const logoUrl = `${origin}/branding/avenire-logo-mark.svg`;
  const dashboardUrl = STATIC_ASSETS.avenireWorkspace;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#000000"/>
  <image href="${escapeXml(dashboardUrl)}" x="560" y="88" width="550" height="454" preserveAspectRatio="xMidYMid slice"/>
  <rect x="560" y="88" width="550" height="454" fill="none" stroke="#242424" stroke-width="1"/>
  <rect x="0" y="0" width="520" height="630" fill="#000000"/>
  <image href="${escapeXml(logoUrl)}" x="80" y="78" width="58" height="46" preserveAspectRatio="xMidYMid meet"/>
  <text x="80" y="272" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="82" font-weight="700" letter-spacing="0">${title}</text>
  <text x="84" y="328" fill="#A3A3A3" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="400" letter-spacing="0">${description}</text>
  <text x="80" y="536" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" letter-spacing="0">Avenire</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}
