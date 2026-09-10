"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase/client";
import { Membership } from "./permissions";
import { modules } from "../lib/permission-map";
import styles from "./employees.module.css";
type Member = Membership & { email: string };
type Event = { id: string; actor: string; created_at: string; details: { email: string; enabled: boolean; is_admin: boolean; permissions: string[] } };
const blank = { email: "", enabled: true, is_admin: false, permissions: [] as string[] };
export function SystemSettings() {
  const [users,setUsers] = useState<Member[]>([]), [events,setEvents] = useState<Event[]>([]);
  const [selected,setSelected] = useState<Member | null>(null), [form,setForm] = useState(blank), [editing,setEditing] = useState(false);
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState("");
  async function reload() {
    setBusy(true); setError("");
    try {
      const client = getSupabase(); if (!client) throw new Error("Supabase no está configurado.");
      const [u,e] = await Promise.all([client.rpc("erp_list_members"), client.from("erp_access_events").select("*").order("created_at",{ascending:false}).limit(100)]);
      if(u.error) throw u.error; if(e.error) throw e.error;
      setUsers(u.data ?? []); setEvents(e.data ?? []);
    } catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(()=>{void reload();},[]);
  function edit(user: Member | null) { setSelected(user); setForm(user ? {email:user.email, enabled:user.enabled,is_admin:user.is_admin,permissions:user.permissions}: {...blank,permissions:[]}); setEditing(true); setError(""); setMessage(""); }
  function toggle(module: string, action: string, on: boolean) {
    const next = new Set(form.permissions);
    if(on) { next.add(`${module}:${action}`); next.add(`${module}:view`); }
    else { next.delete(`${module}:${action}`); if(action==="view") next.delete(`${module}:manage`); }
    setForm({...form,permissions:[...next]});
  }
  async function save() {
    setBusy(true);setError("");
    try {
      const client=getSupabase();if(!client)throw new Error("Supabase no está configurado.");
      const result=await client.rpc("erp_set_access",{p_email:form.email,p_enabled:form.enabled,p_is_admin:form.is_admin,p_permissions:form.permissions,p_version:selected?.version ?? null});
      if(result.error)throw result.error;
      setEditing(false);setMessage("Permisos guardados. Se aplican desde la siguiente operación, incluso con una sesión abierta.");
      window.dispatchEvent(new Event("erp-access-changed"));
      await reload();
    } catch(e) {setError((e as Error).message);} finally {setBusy(false);}
  }
  return <div className={`page-shell ${styles.page}`}><section className="hero-card"><p className="eyebrow">Administración</p><h1>Configuración del sistema</h1><p>Administrá qué puede consultar y hacer cada usuario con su cuenta actual.</p><button disabled={busy||editing} onClick={()=>edit(null)}>Habilitar cuenta existente</button></section>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{message&&<p role="status" className={styles.success}>{message}</p>}
    {editing&&<form className="hero-card" onSubmit={e=>{e.preventDefault();void save();}}><h2>{selected ? "Editar accesos" : "Habilitar usuario"}</h2><fieldset className={styles.grid} disabled={busy}>
      <label className={styles.wide}>Email de la cuenta<input required type="email" readOnly={!!selected} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><small>Debe existir en el Supabase de este ERP. La contraseña se conserva.</small></label>
      <label>Estado<select value={String(form.enabled)} onChange={e=>setForm({...form,enabled:e.target.value==="true"})}><option value="true">Habilitado</option><option value="false">Acceso revocado</option></select></label>
      <label>Tipo de acceso<select value={String(form.is_admin)} onChange={e=>setForm({...form,is_admin:e.target.value==="true"})}><option value="false">Permisos por módulo</option><option value="true">Administrador: acceso completo</option></select></label>
      <div className={`${styles.wide} ${styles.scroll}`}><h3>Permisos por módulo</h3><p>Ver permite consultar. Operar permite crear, editar y ejecutar las acciones disponibles del módulo. Un administrador tiene acceso completo.</p><table><thead><tr><th>Módulo</th><th>Ver</th><th>Operar</th></tr></thead><tbody>{modules.map(([key,label])=><tr key={key}><td>{label}</td>{["view","manage"].map(a=><td key={a}><input style={{width:20,minHeight:20}} type="checkbox" aria-label={`${a==="view"?"Ver":"Operar"} ${label}`} checked={form.is_admin||form.permissions.includes(`${key}:${a}`)} disabled={form.is_admin||key==="dashboard"&&a==="manage"} onChange={e=>toggle(key,a,e.target.checked)}/></td>)}</tr>)}</tbody></table></div>
      <div className={`${styles.wide} ${styles.toolbar}`}><button type="submit">Guardar permisos</button><button type="button" className={styles.secondary} onClick={()=>setEditing(false)}>Cancelar</button></div>
    </fieldset></form>}
    <section className="hero-card"><h2>Usuarios habilitados y revocados</h2><button className={styles.secondary} disabled={busy||editing} onClick={()=>void reload()}>Actualizar</button><div className={styles.scroll}><table><thead><tr><th>Cuenta</th><th>Acceso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{users.map(u=><tr key={u.user_id}><td>{u.email}</td><td>{u.is_admin?"Administrador":`${u.permissions.filter(p=>p.endsWith(":view")).length} módulos`}</td><td>{u.enabled?"Habilitado":"Revocado"}</td><td><button className={styles.secondary} disabled={busy||editing} onClick={()=>edit(u)}>Editar permisos</button></td></tr>)}</tbody></table></div></section>
    <section className="hero-card"><h2>Historial de permisos</h2>{!events.length&&<p>Todavía no hay cambios registrados.</p>}{events.map(e=><details key={e.id}><summary>{new Date(e.created_at).toLocaleString("es-AR")} · {e.details.email}</summary><p>Modificado por {users.find(u=>u.user_id===e.actor)?.email??e.actor}</p><p>{e.details.enabled?"Habilitado":"Revocado"} · {e.details.is_admin?"Administrador":"Usuario"}</p><p>{e.details.permissions.join(", ")||"Sin permisos asignados"}</p></details>)}</section>
  </div>;
}
