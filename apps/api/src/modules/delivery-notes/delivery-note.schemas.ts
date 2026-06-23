import { z } from "zod";

const decimalField = z.coerce.number().positive();

export const createDeliveryNoteSchema = z.object({
  number: z.string().trim().min(1),
  customerId: z.string().trim().min(1),
  salesOrderId: z.string().trim().min(1).optional(),
  deliveryDate: z.coerce.date(),
  createdByUserId: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        quantity: decimalField,
        allocations: z
          .array(
            z.object({
              warehouseId: z.string().trim().min(1),
              quantity: decimalField,
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export const confirmDeliveryNoteSchema = z.object({
  userId: z.string().trim().min(1),
});
