import express from "express";

import { errorHandler } from "./lib/http";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
