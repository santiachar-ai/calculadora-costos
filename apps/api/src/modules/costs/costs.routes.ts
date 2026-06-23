import { Router } from "express";

import { asyncHandler } from "../../lib/http";

import {
  getCostConfiguration,
  saveCostConfiguration,
} from "./costs.service";

export const costsRouter = Router();

costsRouter.get(
  "/costs/configuration",
  asyncHandler(async (_req, res) => {
    const configuration = await getCostConfiguration();
    res.json(configuration);
  }),
);

costsRouter.put(
  "/costs/configuration",
  asyncHandler(async (req, res) => {
    const configuration = await saveCostConfiguration(req.body);
    res.json(configuration);
  }),
);
