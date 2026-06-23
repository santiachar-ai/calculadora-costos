-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "tracksStock" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unitOfMeasureId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_unitOfMeasureId_fkey" FOREIGN KEY ("unitOfMeasureId") REFERENCES "UnitOfMeasure" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATETIME NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesOrderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "deliveryDate" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "confirmedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliveryNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNote_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNote_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryNoteItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryNoteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryNoteItem_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryNoteAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryNoteItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "stockMovementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryNoteAllocation_deliveryNoteItemId_fkey" FOREIGN KEY ("deliveryNoteItemId") REFERENCES "DeliveryNoteItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNoteAllocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryNoteAllocation_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "deliveryNoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "invoiceDate" DATETIME NOT NULL,
    "totalAmount" DECIMAL NOT NULL,
    "fiscalStatus" TEXT,
    "arcaAuthorizationCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" DATETIME NOT NULL,
    "expectedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "receiptDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseReceiptItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseReceiptId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "unitCost" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseReceiptItem_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseReceipt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReceiptItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionFormula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionFormula_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionFormulaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionFormulaId" TEXT NOT NULL,
    "inputProductId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "warehouseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionFormulaItem_productionFormulaId_fkey" FOREIGN KEY ("productionFormulaId") REFERENCES "ProductionFormula" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionFormulaItem_inputProductId_fkey" FOREIGN KEY ("inputProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "plannedQuantity" DECIMAL NOT NULL,
    "producedQuantity" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedDate" DATETIME NOT NULL,
    "closedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductionOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrder_formulaId_fkey" FOREIGN KEY ("formulaId") REFERENCES "ProductionFormula" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionOrderConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionOrderId" TEXT NOT NULL,
    "inputProductId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "plannedQuantity" DECIMAL NOT NULL,
    "actualQuantity" DECIMAL NOT NULL,
    "stockMovementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionOrderConsumption_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrderConsumption_inputProductId_fkey" FOREIGN KEY ("inputProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrderConsumption_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionOrderOutput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productionOrderId" TEXT NOT NULL,
    "outputProductId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "stockMovementId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductionOrderOutput_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrderOutput_outputProductId_fkey" FOREIGN KEY ("outputProductId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductionOrderOutput_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movementType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "referenceModule" TEXT NOT NULL,
    "referenceDocument" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "movementDate" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityOnHand" DECIMAL NOT NULL DEFAULT 0,
    "quantityReserved" DECIMAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockBalance_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "module" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "deliveryNoteId" TEXT,
    CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditEvent_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_code_key" ON "UnitOfMeasure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_number_key" ON "SalesOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNote_number_key" ON "DeliveryNote"("number");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryNoteAllocation_stockMovementId_key" ON "DeliveryNoteAllocation"("stockMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_number_key" ON "PurchaseReceipt"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionFormula_productId_version_key" ON "ProductionFormula"("productId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_number_key" ON "ProductionOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrderConsumption_stockMovementId_key" ON "ProductionOrderConsumption"("stockMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrderOutput_stockMovementId_key" ON "ProductionOrderOutput"("stockMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_warehouseId_productId_key" ON "StockBalance"("warehouseId", "productId");
