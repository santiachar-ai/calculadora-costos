"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const client = getSupabase();
      if (!client) throw new Error("La conexión del ERP todavía no está configurada.");
      const { data, error: authError } = await client.auth.signInWithPassword({ email, password });
      if (authError) throw new Error("No se pudo ingresar. Revisá tu correo y contraseña.");
      const { data: member, error: memberError } = await client.from("erp_members")
        .select("enabled").eq("user_id", data.user.id).eq("enabled", true).maybeSingle();
      if (memberError || !member) {
        await client.auth.signOut();
        throw new Error("Tu usuario no está habilitado para el ERP. Contactá al administrador.");
      }
      setPassword("");
      const next = new URLSearchParams(window.location.search).get("next") || "/";
      const destination = new URL(next, window.location.origin);
      window.location.replace(destination.origin === window.location.origin && destination.pathname !== "/login" ? destination.href : "/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo iniciar sesión. Intentá nuevamente.");
      setBusy(false);
    }
  }
  return <main className="page-shell" style={{ maxWidth: 480, margin: "8vh auto" }}>
    <form className="form-card" onSubmit={login}>
      <p className="eyebrow">ERP Propio</p>
      <h1>Iniciar sesión</h1>
      <p>Ingresá con tu cuenta habilitada para acceder a los módulos.</p>
      <label className="field">Correo<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="field">Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
      <button className="button" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
    </form>
  </main>;
}
