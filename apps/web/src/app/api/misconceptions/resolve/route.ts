import { handleMisconceptionResolveRoutePost } from "./misconception-resolve-route-post";

export async function POST(request: Request) {
  return await handleMisconceptionResolveRoutePost({
    request,
  });
}
