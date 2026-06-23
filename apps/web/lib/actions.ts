"use server";

import { revalidatePath } from "next/cache";

import { DashboardData, DeliveryNoteTraceability } from "./types";
import { getDashboardData } from "./api";

const defaultApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

async function apiMutation<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${defaultApiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorBody?.message ?? `Request failed for ${path}`);
  }

  return (await response.json()) as T;
}

type CreateDeliveryNotePayload = {
  number: string;
  customerId: string;
  deliveryDate: string;
  createdByUserId: string;
  items: {
    productId: string;
    quantity: number;
    allocations: {
      warehouseId: string;
      quantity: number;
    }[];
  }[];
};

export async function createDeliveryNoteAction(payload: CreateDeliveryNotePayload) {
  const created = await apiMutation<DeliveryNoteTraceability>("/delivery-notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  revalidatePath("/");

  return created;
}

export async function confirmDeliveryNoteAction(id: string, userId: string) {
  const confirmed = await apiMutation<DeliveryNoteTraceability>(
    `/delivery-notes/${id}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
    },
  );

  revalidatePath("/");

  return confirmed;
}

export async function refreshDashboardAction(): Promise<DashboardData> {
  return getDashboardData();
}
