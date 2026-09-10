"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { getSupabase } from "../lib/supabase/client";
import { Membership, PermissionsContext } from "./permissions";
import { moduleForPath } from "../lib/permission-map";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [member, setMember] = useState<Membership | null>(null);
  useEffect(() => {
    if (pathname === "/login") return;
    let stopped = false;
    async function refresh() {
      try {
        const client = getSupabase(); if (!client) throw new Error("Supabase no está configurado.");
        const { data: { user } } = await client.auth.getUser();
        if (!user) { window.location.replace("/login"); return; }
        const { data, error } = await client.from("erp_members").select("*").eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        if (!data?.enabled) { window.location.replace("/login"); return; }
        if (!Array.isArray(data.permissions)) throw new Error("Falta aplicar la actualización de permisos en Supabase.");
        if (!stopped) {setMember(data); setError("");}
      } catch(e) { if (!stopped) {setMember(null);setError((e as Error).message);} }
    }
    void refresh();
    window.addEventListener("focus",refresh);window.addEventListener("erp-access-changed",refresh);
    const timer=window.setInterval(refresh,30000);
    return ()=>{stopped=true;window.clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("erp-access-changed",refresh);};
  },[pathname]);
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
  if (!member) return <main className="page-shell"><p role={error ? "alert" : "status"}>{error || "Verificando accesos…"}</p></main>;
  const module = moduleForPath(pathname);
  const canView = pathname === "/sin-acceso" || member.is_admin || member.permissions.includes(`${module}:view`);
  return <PermissionsContext.Provider value={member}><div className="app-frame">
    <AppSidebar member={member} />
    <div className="app-content">
      <header className="topbar">
        <div><div className="topbar-title">Panel ERP</div><div className="topbar-subtitle">Operación y trazabilidad</div></div>
        <button className="button-secondary" disabled={busy} onClick={logout}>{busy ? "Cerrando…" : "Cerrar sesión"}</button>
        {error && <p role="alert">{error}</p>}
      </header>
      <div className="content-scroll">{canView ? children : <section className="hero-card"><h1>Sin acceso a este módulo</h1><p>Solicitá el permiso al administrador.</p></section>}</div>
    </div>
  </div></PermissionsContext.Provider>;
}
