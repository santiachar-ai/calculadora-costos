import { Router } from "express";

import { costsRouter } from "../modules/costs/costs.routes";
import { deliveryNoteRouter } from "../modules/delivery-notes/delivery-note.routes";
import { mastersRouter } from "../modules/masters/masters.routes";
import { stockRouter } from "../modules/stock/stock.routes";

import { healthRouter } from "./health.routes";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({
    name: "ERP Propio API",
    version: "0.1.0",
  });
});

apiRouter.use("/health", healthRouter);
apiRouter.use(costsRouter);
apiRouter.use(mastersRouter);
apiRouter.use(deliveryNoteRouter);
apiRouter.use(stockRouter);
