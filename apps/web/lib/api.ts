import "server-only";

import { DashboardData } from "./types";

const defaultApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

const emptyDashboardData: DashboardData = {
  stockBalances: [],
  stockMovements: [],
  deliveryNotes: [],
  customers: [],
  products: [],
  warehouses: [],
  users: [],
};

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${defaultApiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    throw new Error(errorBody?.message ?? `Request failed for ${path}`);
  }

  return (await response.json()) as T;
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const [
      stockBalances,
      stockMovements,
      deliveryNotes,
      customers,
      products,
      warehouses,
      users,
    ] = await Promise.all([
      apiFetch<DashboardData["stockBalances"]>("/stock-balances"),
      apiFetch<DashboardData["stockMovements"]>("/stock-movements"),
      apiFetch<DashboardData["deliveryNotes"]>("/delivery-notes"),
      apiFetch<DashboardData["customers"]>("/customers"),
      apiFetch<DashboardData["products"]>("/products"),
      apiFetch<DashboardData["warehouses"]>("/warehouses"),
      apiFetch<DashboardData["users"]>("/users"),
    ]);

    return {
      stockBalances,
      stockMovements,
      deliveryNotes,
      customers,
      products,
      warehouses,
      users,
    };
  } catch {
    return emptyDashboardData;
  }
}
