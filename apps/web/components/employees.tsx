"use client";

import { useEffect, useState } from "react";
import { employeeRequest } from "../lib/employee-actions";
import styles from "./employees.module.css";
import { useAccess } from "./permissions";

const blank = { employeeNumber: "", firstName: "", lastName: "", documentNumber: "", email: "", phone: "", address: "", department: "", position: "", hireDate: "", isActive: true, notes: "" };
type Employee = typeof blank & { id: string; version: number };
const fields: { key: Exclude<keyof typeof blank, "isActive" | "notes">; label: string; required?: boolean; type?: string; max?: number }[] = [
  { key: "employeeNumber", label: "Número de legajo", required: true, max: 30 },
  { key: "firstName", label: "Nombre", required: true },
  { key: "lastName", label: "Apellido", required: true },
  { key: "documentNumber", label: "DNI", required: true, max: 15 },
  { key: "hireDate", label: "Fecha de ingreso", required: true, type: "date" },
  { key: "department", label: "Sector" },
  { key: "position", label: "Puesto" },
  { key: "email", label: "Email", type: "email", max: 254 },
  { key: "phone", label: "Teléfono", type: "tel", max: 50 },
  { key: "address", label: "Domicilio", max: 300 },
];

export function Employees() {
  const canManage = useAccess("personal");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState({ ...blank });
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  async function reload() {
    setBusy(true); setError("");
    try {
      const result = await employeeRequest("/employees");
      if (!result.ok) throw new Error(result.message);
      setEmployees(result.data); setLoaded(true);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los legajos."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void reload(); }, []);
  function edit(employee: Employee | null) {
    setSelected(employee);
    setForm(employee ? Object.fromEntries(Object.keys(blank).map(key => [key, employee[key as keyof typeof blank]])) as typeof blank : { ...blank });
    setEditing(true); setError(""); setMessage("");
  }
  async function save() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await employeeRequest(`/employees${selected ? `/${selected.id}` : ""}`, selected ? "PUT" : "POST", { ...form, ...(selected ? { version: selected.version } : {}) });
      if (!result.ok) throw new Error(result.message);
      const saved: Employee = result.data;
      setEmployees(list => [...list.filter(e => e.id !== saved.id), saved].sort((a, b) => a.lastName.localeCompare(b.lastName, "es") || a.firstName.localeCompare(b.firstName, "es")));
      setSelected(null); setEditing(false); setMessage(`Legajo ${saved.employeeNumber} guardado.`);
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el legajo."); }
    finally { setBusy(false); }
  }
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = employees.filter(e => (status === "all" || e.isActive === (status === "active")) && normalize(`${e.employeeNumber} ${e.firstName} ${e.lastName} ${e.documentNumber} ${e.department} ${e.position}`).includes(normalize(query.trim())));
  return <div className={`page-shell ${styles.page}`}>
    <section className="hero-card">
      <p className="eyebrow">Personal</p><a href="/personal/horas">Horas y asistencia</a><h1>Legajos de empleados</h1>
      <p>Datos personales y laborales de tu equipo, en un solo lugar.</p>
      <div className={styles.toolbar}><span>{loaded ? `${employees.filter(e => e.isActive).length} activos · ${employees.filter(e => !e.isActive).length} inactivos` : "Cargando legajos…"}</span><button disabled={busy || editing || !loaded || !canManage} onClick={() => edit(null)}>Nuevo empleado</button></div>
    </section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    {editing && <form className="hero-card" onSubmit={e => { e.preventDefault(); void save(); }}>
      <h2>{selected ? `Editar legajo ${selected.employeeNumber}` : "Nuevo empleado"}</h2><p>Los campos con * son obligatorios.</p>
      <fieldset disabled={busy || !canManage} className={styles.grid}>
        {fields.map(field => <label key={field.key}>{field.label}{field.required ? " *" : ""}<input type={field.type ?? "text"} required={field.required} maxLength={field.max ?? 150} value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} /></label>)}
        <label>Estado<select value={form.isActive ? "active" : "inactive"} onChange={e => setForm({ ...form, isActive: e.target.value === "active" })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
        <label className={styles.wide}>Observaciones<textarea rows={3} maxLength={3000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        <div className={`${styles.toolbar} ${styles.wide}`}><button type="submit">{busy ? "Guardando…" : "Guardar legajo"}</button><button type="button" className={styles.secondary} onClick={() => { setEditing(false); setSelected(null); setError(""); }}>Cancelar</button></div>
      </fieldset>{!canManage && <button type="button" onClick={() => setEditing(false)}>Cerrar consulta</button>}
    </form>}
    <section className="hero-card"><h2>Equipo</h2>
      <div className={styles.filters}><label>Buscar<input type="search" placeholder="Nombre, legajo, DNI, sector o puesto" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label><button className={styles.secondary} disabled={busy || editing} onClick={() => void reload()}>Actualizar</button></div>
      {loaded && !visible.length && <p>{employees.length ? "No hay empleados que coincidan con la búsqueda." : "Todavía no hay empleados. Creá el primer legajo para comenzar."}</p>}
      {visible.length > 0 && <div className={styles.scroll}><table><thead><tr><th>Legajo</th><th>Empleado</th><th>Sector / puesto</th><th>Ingreso</th><th>Estado</th><th><span className={styles.srOnly}>Acciones</span></th></tr></thead><tbody>{visible.map(e => <tr key={e.id}><td>{e.employeeNumber}</td><td><strong>{e.lastName}, {e.firstName}</strong><small>DNI {e.documentNumber}</small></td><td>{e.department || "Sin sector"}<small>{e.position || "Sin puesto"}</small></td><td>{e.hireDate.split("-").reverse().join("/")}</td><td><span className={e.isActive ? styles.active : styles.inactive}>{e.isActive ? "Activo" : "Inactivo"}</span></td><td><button className={styles.secondary} disabled={busy || editing} aria-label={`Ver o editar legajo ${e.employeeNumber}`} onClick={() => edit(e)}>Ver / editar</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
