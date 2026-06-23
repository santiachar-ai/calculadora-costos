import { Router } from "express";

import { asyncHandler } from "../../lib/http";
import { prisma } from "../../lib/prisma";

export const stockRouter = Router();

stockRouter.get(
  "/stock-balances",
  asyncHandler(async (_req, res) => {
    const balances = await prisma.stockBalance.findMany({
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: [
        { warehouse: { name: "asc" } },
        { product: { name: "asc" } },
      ],
    });

    res.json(balances);
  }),
);

stockRouter.get(
  "/stock-movements",
  asyncHandler(async (_req, res) => {
    const movements = await prisma.stockMovement.findMany({
      include: {
        warehouse: true,
        product: true,
      },
      orderBy: {
        movementDate: "desc",
      },
    });

    res.json(movements);
  }),
);
