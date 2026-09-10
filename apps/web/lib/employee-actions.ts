"use client";
import { getSupabase } from "./supabase/client";
export async function employeeRequest(path: string, method: "GET" | "POST" | "PUT" = "GET", payload?: unknown) {
  const client = getSupabase();
  if (!client) return { ok: false as const, message: "Supabase no está configurado." };
  if (!/^\/employees(?:\/[a-f0-9-]+)?$/.test(path)) throw new Error("Ruta inválida");
  try {
    if (method === "GET") {
      const { data, error } = await client.from("erp_employees").select("*").order("employee_number");
      if (error) throw error;
      return { ok: true as const, data: (data ?? []).map(row => ({ ...row.payload, id: row.id, version: row.version })) };
    }
    const { version, ...input } = payload as Record<string, unknown>;
    const { data, error } = await client.rpc("erp_save_employee", { p_id: method === "PUT" ? path.split("/")[2] : null, p_version: version ?? null, p_payload: input });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: true as const, data: { ...row.payload, id: row.id, version: row.version } };
  } catch (error) { return { ok: false as const, message: error instanceof Error ? error.message : (error as { message?: string }).message ?? "No se pudo guardar el legajo." }; }
}
