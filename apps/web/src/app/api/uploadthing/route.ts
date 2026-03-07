import { createRouteHandler } from "@avenire/storage";
import { router } from "@/lib/upload";

export const { GET, POST } = createRouteHandler({
  router,
});
