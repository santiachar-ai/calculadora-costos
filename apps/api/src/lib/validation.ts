import { Prisma } from "@prisma/client";

export function toDecimal(value: number | string) {
  return new Prisma.Decimal(value);
}

export function decimalToNumber(value: Prisma.Decimal | number | string) {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }

  return Number(value);
}
