import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./index";

const port = Number(process.env.PORT ?? 3002);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Realtime backend listening on http://localhost:${info.port}`);
  },
);
