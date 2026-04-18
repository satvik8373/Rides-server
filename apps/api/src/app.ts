import "express-async-errors";
import cors from "cors";
import express from "express";
import helmetModule from "helmet";
import morgan from "morgan";
import { errorHandlerMiddleware } from "./middleware/error-handler.js";
import { requestContextMiddleware } from "./middleware/request-context.js";
import v1Router from "./routes/v1/index.js";
import webhookRouter from "./routes/webhooks.js";
import { postgresService } from "./services/postgres.service.js";
import { seedDemoData } from "./store/data-store.js";

const helmet = helmetModule;

export const createApp = () => {
  const app = express();

  app.use(requestContextMiddleware);
  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));

  app.use("/v1/webhooks", express.raw({ type: "application/json" }), webhookRouter);

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/v1", v1Router);

  app.use(errorHandlerMiddleware);

  // Startup logging
  console.log("✓ Express app initialized successfully");

  return app;
};

seedDemoData();
postgresService.connect().catch(() => {
  // eslint-disable-next-line no-console
  console.warn("Postgres not connected. Using in-memory store.");
});
