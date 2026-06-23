-- CreateTable
CREATE TABLE "CostConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "paramsJson" TEXT NOT NULL,
    "purchaseRulesJson" TEXT NOT NULL,
    "salesRulesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CostConfiguration_key_key" ON "CostConfiguration"("key");
