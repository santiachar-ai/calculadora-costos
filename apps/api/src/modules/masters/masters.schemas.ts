import { ProductType } from "@prisma/client";
import { z } from "zod";

export const createCustomerSchema = z.object({
  code: z.string().trim().min(1),
  businessName: z.string().trim().min(1),
  taxId: z.string().trim().optional(),
  email: z.email().optional(),
  phone: z.string().trim().optional(),
});

export const createWarehouseSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  type: z.string().trim().optional(),
});

export const createProductSchema = z.object({
  sku: z.string().trim().min(1),
  name: z.string().trim().min(1),
  productType: z.enum(ProductType),
  tracksStock: z.boolean().default(true),
  unitOfMeasure: z.object({
    code: z.string().trim().min(1),
    name: z.string().trim().min(1),
  }),
});
