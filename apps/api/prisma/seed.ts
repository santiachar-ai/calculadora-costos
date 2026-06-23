import {
  AuditEventType,
  Prisma,
  ProductType,
  StockDirection,
  StockMovementType,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.deliveryNoteAllocation.deleteMany();
  await prisma.deliveryNoteItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.deliveryNote.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.purchaseReceiptItem.deleteMany();
  await prisma.purchaseReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.productionOrderConsumption.deleteMany();
  await prisma.productionOrderOutput.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.productionFormulaItem.deleteMany();
  await prisma.productionFormula.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.product.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Admin ERP",
      email: "admin@erp.local",
      passwordHash: "dev-only-password",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      code: "CLI-0001",
      businessName: "Cliente Demo SA",
      taxId: "30-12345678-9",
      email: "compras@clientedemo.test",
      phone: "1130000000",
    },
  });

  const tankDefinitions = [
    { code: "TQ-01", name: "Tanque 1", type: "TANK" },
    { code: "TQ-02", name: "Tanque 2", type: "TANK" },
    { code: "TQ-03", name: "Tanque 3", type: "TANK" },
    { code: "TQ-04", name: "Tanque 4", type: "TANK" },
    { code: "TQ-05", name: "Tanque 5", type: "TANK" },
    { code: "TQ-06", name: "Tanque 6", type: "TANK" },
    { code: "TQ-07", name: "Tanque 7", type: "TANK" },
    { code: "TQ-08", name: "Tanque 8", type: "TANK" },
    { code: "DEP-BIDONES", name: "Deposito Bidones", type: "FINISHED_GOODS" },
  ] as const;

  const warehouses = await Promise.all(
    tankDefinitions.map((warehouse) =>
      prisma.warehouse.create({
        data: warehouse,
      }),
    ),
  );

  const unit = await prisma.unitOfMeasure.create({
    data: {
      code: "LTS",
      name: "Litros",
    },
  });

  const [industrialUrea, urea325, urkem] = await Promise.all([
    prisma.product.create({
      data: {
        sku: "SOL-UREA-IND",
        name: "Solucion Urea Industrial",
        productType: ProductType.MERCHANDISE,
        unitOfMeasureId: unit.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "UREA-325-BASE",
        name: "Solucion urea 32,5",
        productType: ProductType.MERCHANDISE,
        unitOfMeasureId: unit.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "URKEM-AUTO",
        name: "Urkem urea automotor liquida",
        productType: ProductType.MERCHANDISE,
        unitOfMeasureId: unit.id,
      },
    }),
  ]);

  await prisma.stockBalance.createMany({
    data: [
      {
        warehouseId: warehouses[0].id,
        productId: industrialUrea.id,
        quantityOnHand: new Prisma.Decimal(12000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[1].id,
        productId: industrialUrea.id,
        quantityOnHand: new Prisma.Decimal(9000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[2].id,
        productId: urea325.id,
        quantityOnHand: new Prisma.Decimal(18000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[3].id,
        productId: urea325.id,
        quantityOnHand: new Prisma.Decimal(7000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[4].id,
        productId: industrialUrea.id,
        quantityOnHand: new Prisma.Decimal(15000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[5].id,
        productId: urea325.id,
        quantityOnHand: new Prisma.Decimal(11000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[6].id,
        productId: urkem.id,
        quantityOnHand: new Prisma.Decimal(6000),
        quantityReserved: new Prisma.Decimal(0),
      },
      {
        warehouseId: warehouses[7].id,
        productId: urea325.id,
        quantityOnHand: new Prisma.Decimal(14000),
        quantityReserved: new Prisma.Decimal(0),
      },
    ],
  });

  await prisma.stockMovement.createMany({
    data: [
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[0].id,
        productId: industrialUrea.id,
        quantity: new Prisma.Decimal(12000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-01",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[1].id,
        productId: industrialUrea.id,
        quantity: new Prisma.Decimal(9000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-02",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[2].id,
        productId: urea325.id,
        quantity: new Prisma.Decimal(18000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-03",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[3].id,
        productId: urea325.id,
        quantity: new Prisma.Decimal(7000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-04",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[4].id,
        productId: industrialUrea.id,
        quantity: new Prisma.Decimal(15000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-05",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[5].id,
        productId: urea325.id,
        quantity: new Prisma.Decimal(11000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-06",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[6].id,
        productId: urkem.id,
        quantity: new Prisma.Decimal(6000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-07",
        movementDate: new Date(),
        createdById: user.id,
      },
      {
        movementType: StockMovementType.ADJUSTMENT,
        direction: StockDirection.IN,
        warehouseId: warehouses[7].id,
        productId: urea325.id,
        quantity: new Prisma.Decimal(14000),
        referenceModule: "seed",
        referenceDocument: "INITIAL-STOCK",
        referenceId: "seed-tank-08",
        movementDate: new Date(),
        createdById: user.id,
      },
    ],
  });

  await prisma.auditEvent.create({
    data: {
      module: "seed",
      entityName: "Bootstrap",
      entityId: "initial-data",
      eventType: AuditEventType.CREATED,
      userId: user.id,
      payloadJson: JSON.stringify({
        userId: user.id,
        customerId: customer.id,
        warehouses: warehouses.map((warehouse) => warehouse.id),
        products: [industrialUrea.id, urea325.id, urkem.id],
      }),
    },
  });

  console.log("Seed completed");
  console.log(
    JSON.stringify(
      {
        user,
        customer,
        warehouses,
        products: [industrialUrea, urea325, urkem],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
