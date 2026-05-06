import "dotenv/config";
import {
  logInfo,
  reportError,
  shutdownObservability,
} from "@avenire/observability";
import { serve } from "@hono/node-server";
import app from "./index";

const port = Number(process.env.PORT ?? 3002);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    void logInfo({
      eventName: "backend.started",
      context: {
        feature: "realtime",
        service: "backend",
      },
      payload: {
        port: info.port,
      },
    });
    console.log(`Realtime backend listening on http://localhost:${info.port}`);
  }
);

process.on("uncaughtException", (error) => {
  void reportError({
    error,
    eventName: "backend.uncaught_exception",
    context: {
      feature: "runtime",
      service: "backend",
    },
  });
  shutdownObservability();
  throw error;
});

process.on("unhandledRejection", (error) => {
  void reportError({
    error,
    eventName: "backend.unhandled_rejection",
    context: {
      feature: "runtime",
      service: "backend",
    },
  });
});
