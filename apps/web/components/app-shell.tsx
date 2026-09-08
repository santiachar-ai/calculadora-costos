"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { getSupabase } from "../lib/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (pathname === "/login") return;
    const client = getSupabase();
    const { data } = client?.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) window.location.replace("/login");
    }) ?? {};
    return () => data?.subscription.unsubscribe();
  }, [pathname]);
  if (pathname === "/login") return children;
  async function logout() {
    setBusy(true);
    setError("");
    const result = await getSupabase()?.auth.signOut({ scope: "local" });
    if (result?.error) { setError("No se pudo cerrar sesión. Intentá nuevamente."); setBusy(false); return; }
    window.location.replace("/login");
  }
  return <div className="app-frame">
    <AppSidebar />
    <div className="app-content">
      <header className="topbar">
        <div><div className="topbar-title">Panel ERP</div><div className="topbar-subtitle">Operación y trazabilidad</div></div>
        <button className="button-secondary" disabled={busy} onClick={logout}>{busy ? "Cerrando…" : "Cerrar sesión"}</button>
        {error && <p role="alert">{error}</p>}
      </header>
      <div className="content-scroll">{children}</div>
    </div>
  </div>;
}
