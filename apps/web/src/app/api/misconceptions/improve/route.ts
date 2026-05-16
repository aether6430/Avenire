import { handleMisconceptionImproveRoutePost } from "./misconception-improve-route-post";

export async function POST(request: Request) {
  return await handleMisconceptionImproveRoutePost({
    request,
  });
}
