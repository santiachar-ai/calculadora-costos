import { prisma } from "../../lib/prisma";

import {
  createCustomerSchema,
  createProductSchema,
  createWarehouseSchema,
} from "./masters.schemas";

export async function listCustomers() {
  return prisma.customer.findMany({
    orderBy: {
      businessName: "asc",
    },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createCustomer(input: unknown) {
  const data = createCustomerSchema.parse(input);

  return prisma.customer.create({
    data,
  });
}

export async function listWarehouses() {
  return prisma.warehouse.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function createWarehouse(input: unknown) {
  const data = createWarehouseSchema.parse(input);

  return prisma.warehouse.create({
    data,
  });
}

export async function listProducts() {
  return prisma.product.findMany({
    include: {
      unitOfMeasure: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createProduct(input: unknown) {
  const data = createProductSchema.parse(input);

  return prisma.product.create({
    data: {
      sku: data.sku,
      name: data.name,
      productType: data.productType,
      tracksStock: data.tracksStock,
      unitOfMeasure: {
        connectOrCreate: {
          where: {
            code: data.unitOfMeasure.code,
          },
          create: data.unitOfMeasure,
        },
      },
    },
    include: {
      unitOfMeasure: true,
    },
  });
}
