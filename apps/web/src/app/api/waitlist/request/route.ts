import { handleWaitlistRequestPost } from "./waitlist-request-route-post";

export async function POST(request: Request) {
  return await handleWaitlistRequestPost({ request });
}
