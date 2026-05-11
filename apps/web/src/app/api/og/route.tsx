export const runtime = "edge";

export async function GET(request: Request) {
  const imageUrl = new URL("/og/avenire.png", request.url);
  const image = await fetch(imageUrl, {
    cache: "force-cache",
  });

  if (!image.ok) {
    return new Response("OG image not found", { status: 404 });
  }

  return new Response(image.body, {
    headers: {
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      "Content-Type": "image/png",
    },
  });
}
