import {
  AuditEventType,
  DocumentStatus,
  Prisma,
  StockDirection,
  StockMovementType,
} from "@prisma/client";

import { AppError } from "../../lib/http";
import { decimalToNumber, toDecimal } from "../../lib/validation";
import { prisma } from "../../lib/prisma";

import {
  confirmDeliveryNoteSchema,
  createDeliveryNoteSchema,
} from "./delivery-note.schemas";

export async function listDeliveryNotes() {
  return prisma.deliveryNote.findMany({
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          allocations: {
            include: {
              warehouse: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getDeliveryNoteTraceability(id: string) {
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          allocations: {
            include: {
              warehouse: true,
              stockMovement: true,
            },
          },
        },
      },
      auditEvents: {
        orderBy: {
          eventDate: "desc",
        },
      },
    },
  });

  if (!deliveryNote) {
    throw new AppError(404, "Delivery note not found");
  }

  return deliveryNote;
}

export async function createDeliveryNote(input: unknown) {
  const data = createDeliveryNoteSchema.parse(input);

  const [customer, createdByUser, products, warehouses] = await Promise.all([
    prisma.customer.findUnique({ where: { id: data.customerId } }),
    prisma.user.findUnique({ where: { id: data.createdByUserId } }),
    prisma.product.findMany({
      where: {
        id: {
          in: data.items.map((item) => item.productId),
        },
      },
    }),
    prisma.warehouse.findMany({
      where: {
        id: {
          in: data.items.flatMap((item) =>
            item.allocations.map((allocation) => allocation.warehouseId),
          ),
        },
      },
    }),
  ]);

  if (!customer) {
    throw new AppError(404, "Customer not found");
  }

  if (!createdByUser) {
    throw new AppError(404, "User not found");
  }

  const productIds = new Set(products.map((product) => product.id));
  const warehouseIds = new Set(warehouses.map((warehouse) => warehouse.id));

  for (const item of data.items) {
    if (!productIds.has(item.productId)) {
      throw new AppError(404, `Product ${item.productId} not found`);
    }

    const allocationsTotal = item.allocations.reduce(
      (sum, allocation) => sum + allocation.quantity,
      0,
    );

    if (allocationsTotal !== item.quantity) {
      throw new AppError(
        400,
        `Allocations for product ${item.productId} must match item quantity`,
      );
    }

    for (const allocation of item.allocations) {
      if (!warehouseIds.has(allocation.warehouseId)) {
        throw new AppError(404, `Warehouse ${allocation.warehouseId} not found`);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const deliveryNote = await tx.deliveryNote.create({
      data: {
        number: data.number,
        customerId: data.customerId,
        salesOrderId: data.salesOrderId,
        deliveryDate: data.deliveryDate,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: toDecimal(item.quantity),
            allocations: {
              create: item.allocations.map((allocation) => ({
                warehouseId: allocation.warehouseId,
                quantity: toDecimal(allocation.quantity),
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            allocations: true,
          },
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        module: "delivery_notes",
        entityName: "DeliveryNote",
        entityId: deliveryNote.id,
        eventType: AuditEventType.CREATED,
        userId: data.createdByUserId,
        deliveryNoteId: deliveryNote.id,
        payloadJson: JSON.stringify({
          number: deliveryNote.number,
          itemCount: deliveryNote.items.length,
        }),
      },
    });

    return deliveryNote;
  });
}

export async function confirmDeliveryNote(id: string, input: unknown) {
  const data = confirmDeliveryNoteSchema.parse(input);

  const confirmedByUser = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  if (!confirmedByUser) {
    throw new AppError(404, "User not found");
  }

  return prisma.$transaction(async (tx) => {
    const deliveryNote = await tx.deliveryNote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            allocations: true,
          },
        },
      },
    });

    if (!deliveryNote) {
      throw new AppError(404, "Delivery note not found");
    }

    if (deliveryNote.status !== DocumentStatus.DRAFT) {
      throw new AppError(409, "Only draft delivery notes can be confirmed");
    }

    const balanceKeys = new Set<string>();

    for (const item of deliveryNote.items) {
      if (!item.product.tracksStock) {
        throw new AppError(
          400,
          `Product ${item.product.name} does not track stock and cannot be included in a delivery note confirmation`,
        );
      }

      const itemQuantity = decimalToNumber(item.quantity);
      const allocationsTotal = item.allocations.reduce(
        (sum, allocation) => sum + decimalToNumber(allocation.quantity),
        0,
      );

      if (allocationsTotal !== itemQuantity) {
        throw new AppError(
          400,
          `Allocations for item ${item.id} do not match the remitted quantity`,
        );
      }

      for (const allocation of item.allocations) {
        balanceKeys.add(`${allocation.warehouseId}:${item.productId}`);
      }
    }

    const balances = await tx.stockBalance.findMany({
      where: {
        OR: Array.from(balanceKeys).map((key) => {
          const [warehouseId, productId] = key.split(":");
          return { warehouseId, productId };
        }),
      },
    });

    const balancesMap = new Map(
      balances.map((balance) => [
        `${balance.warehouseId}:${balance.productId}`,
        balance,
      ]),
    );

    for (const item of deliveryNote.items) {
      for (const allocation of item.allocations) {
        const key = `${allocation.warehouseId}:${item.productId}`;
        const existingBalance = balancesMap.get(key);
        const available = existingBalance
          ? decimalToNumber(existingBalance.quantityOnHand)
          : 0;
        const requested = decimalToNumber(allocation.quantity);

        if (available < requested) {
          throw new AppError(
            400,
            `Insufficient stock for product ${item.product.name} in warehouse ${allocation.warehouseId}`,
          );
        }
      }
    }

    for (const item of deliveryNote.items) {
      for (const allocation of item.allocations) {
        const movement = await tx.stockMovement.create({
          data: {
            movementType: StockMovementType.DELIVERY_NOTE,
            direction: StockDirection.OUT,
            warehouseId: allocation.warehouseId,
            productId: item.productId,
            quantity: allocation.quantity,
            referenceModule: "delivery_notes",
            referenceDocument: deliveryNote.number,
            referenceId: deliveryNote.id,
            movementDate: new Date(),
            createdById: data.userId,
          },
        });

        await tx.deliveryNoteAllocation.update({
          where: { id: allocation.id },
          data: { stockMovementId: movement.id },
        });

        const key = `${allocation.warehouseId}:${item.productId}`;
        const existingBalance = balancesMap.get(key);
        const nextQuantity = new Prisma.Decimal(
          decimalToNumber(existingBalance?.quantityOnHand ?? 0) -
            decimalToNumber(allocation.quantity),
        );

        if (existingBalance) {
          await tx.stockBalance.update({
            where: { id: existingBalance.id },
            data: {
              quantityOnHand: nextQuantity,
            },
          });
        } else {
          await tx.stockBalance.create({
            data: {
              warehouseId: allocation.warehouseId,
              productId: item.productId,
              quantityOnHand: nextQuantity,
              quantityReserved: new Prisma.Decimal(0),
            },
          });
        }

        balancesMap.set(key, {
          ...(existingBalance ?? {
            id: "",
            warehouseId: allocation.warehouseId,
            productId: item.productId,
            quantityReserved: new Prisma.Decimal(0),
            updatedAt: new Date(),
          }),
          quantityOnHand: nextQuantity,
        });
      }
    }

    const confirmedDeliveryNote = await tx.deliveryNote.update({
      where: { id: deliveryNote.id },
      data: {
        status: DocumentStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedById: data.userId,
      },
      include: {
        items: {
          include: {
            allocations: {
              include: {
                stockMovement: true,
              },
            },
          },
        },
      },
    });

    await tx.auditEvent.create({
      data: {
        module: "delivery_notes",
        entityName: "DeliveryNote",
        entityId: confirmedDeliveryNote.id,
        eventType: AuditEventType.CONFIRMED,
        userId: data.userId,
        deliveryNoteId: confirmedDeliveryNote.id,
        payloadJson: JSON.stringify({
          number: confirmedDeliveryNote.number,
          allocations: confirmedDeliveryNote.items.reduce(
            (sum, item) => sum + item.allocations.length,
            0,
          ),
        }),
      },
    });

    return confirmedDeliveryNote;
  });
}
