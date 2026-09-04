"use client";

import { useMemo, useState } from "react";

type Status = "Correcto" | "Revisar" | "Incompleto";
type Row = {
  id: number;
  employee: string;
  area: string;
  date: string;
  day: string;
  punches: string[];
  shift: string;
  schedule: string;
  worked: number | null;
  regular: number;
  overtime: number;
  status: Status;
  note?: string;
};

const rows: Row[] = [
  { id: 1, employee: "Mariana Lopez", area: "Administracion", date: "04/09", day: "Viernes", punches: ["06:57", "14:05"], shift: "Manana · semana con sabado", schedule: "07:00–14:00", worked: 428, regular: 420, overtime: 8, status: "Correcto" },
  { id: 2, employee: "Diego Alvarez", area: "Deposito", date: "04/09", day: "Viernes", punches: ["07:03", "12:01", "12:42", "15:38"], shift: "Deposito · semana con sabado", schedule: "07:00–14:00", worked: 474, regular: 420, overtime: 54, status: "Correcto" },
  { id: 3, employee: "Sofia Ramirez", area: "Produccion", date: "04/09", day: "Viernes", punches: ["13:56", "22:11"], shift: "Tarde · semana con sabado", schedule: "14:00–21:00", worked: 495, regular: 420, overtime: 75, status: "Correcto" },
  { id: 4, employee: "Martin Benitez", area: "Produccion", date: "04/09", day: "Viernes", punches: ["05:49"], shift: "Sin asignar", schedule: "—", worked: null, regular: 0, overtime: 0, status: "Incompleto", note: "Falta la marcacion de salida" },
  { id: 5, employee: "Lucia Fernandez", area: "Logistica", date: "05/09", day: "Sabado", punches: ["07:58", "12:32"], shift: "Sabado alterno asignado", schedule: "08:00–12:00", worked: 274, regular: 240, overtime: 34, status: "Correcto" },
  { id: 6, employee: "Carlos Gomez", area: "Deposito", date: "05/09", day: "Sabado", punches: ["08:06", "11:51"], shift: "Sabado libre", schedule: "No correspondia", worked: 225, regular: 0, overtime: 225, status: "Revisar", note: "Toda la jornada se computa como extra" },
];

function duration(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours ? `${hours} h` : ""}${rest ? ` ${rest} min` : ""}`.trim() || "0 h";
}

export function AttendanceClient() {
  const [tab, setTab] = useState<"detalle" | "rotacion" | "reglas">("detalle");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "Todos">("Todos");
  const [updated, setUpdated] = useState(false);
  const filtered = useMemo(() => rows.filter((row) => `${row.employee} ${row.area}`.toLowerCase().includes(query.toLowerCase()) && (status === "Todos" || row.status === status)), [query, status]);
  const totalWorked = rows.reduce((sum, row) => sum + (row.worked ?? 0), 0);
  const totalOvertime = rows.reduce((sum, row) => sum + row.overtime, 0);
  const issues = rows.filter((row) => row.status !== "Correcto").length;

  function recalculate() {
    setUpdated(true);
    window.setTimeout(() => setUpdated(false), 1600);
  }

  return <div className="page-shell attendance-page">
    <section className="attendance-heading">
      <div><p className="eyebrow">Personal / Horas y asistencia</p><h1>Control de horas</h1><p>Asigna las marcaciones de BioTime al turno mas probable y separa horas normales y extras.</p></div>
      <div className="attendance-actions"><button className="button-secondary" type="button">Importar marcaciones</button><button className="button" type="button" onClick={recalculate}>{updated ? "Calculo actualizado" : "Recalcular semana"}</button></div>
    </section>

    <section className="attendance-period"><div><span>Periodo</span><strong>31 ago — 6 sep 2026</strong></div><div className="biotime-state"><i /> <span><strong>BioTime conectado</strong><small>Ultima sincronizacion hoy, 08:42</small></span></div></section>

    <section className="attendance-kpis"><article><span>Empleados</span><strong>28</strong><small>27 con marcaciones</small></article><article><span>Horas trabajadas</span><strong>{duration(totalWorked)}</strong><small>Semana seleccionada</small></article><article><span>Horas extra</span><strong>{duration(totalOvertime)}</strong><small>Segun turno asignado</small></article><article className="attention"><span>Para revisar</span><strong>{issues}</strong><small>Sin aprobacion automatica</small></article></section>

    <div className="attendance-tabs"><button className={tab === "detalle" ? "active" : ""} onClick={() => setTab("detalle")}>Asistencia semanal</button><button className={tab === "rotacion" ? "active" : ""} onClick={() => setTab("rotacion")}>Turnos rotativos</button><button className={tab === "reglas" ? "active" : ""} onClick={() => setTab("reglas")}>Reglas de calculo</button></div>

    {tab === "detalle" && <section className="table-card attendance-table-card"><div className="section-head"><div><h2>Detalle de marcaciones</h2><p>Las jornadas dudosas quedan pendientes para revision manual.</p></div><div className="attendance-filters"><input aria-label="Buscar empleado" placeholder="Buscar empleado..." value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar estado" value={status} onChange={(event) => setStatus(event.target.value as Status | "Todos")}><option>Todos</option><option>Correcto</option><option>Revisar</option><option>Incompleto</option></select></div></div><div className="table-wrap"><table><thead><tr><th>Empleado</th><th>Dia</th><th>Marcaciones</th><th>Turno asignado</th><th>Trabajado</th><th>Normales</th><th>Extras</th><th>Estado</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.employee}</strong><small>{row.area}</small></td><td><strong>{row.date}</strong><small>{row.day}</small></td><td><div className="punch-list">{row.punches.map((punch) => <span key={punch}>{punch}</span>)}</div>{row.note && <small className="attendance-note">{row.note}</small>}</td><td><strong>{row.shift}</strong><small>{row.schedule}</small></td><td>{duration(row.worked)}</td><td>{duration(row.regular)}</td><td className={row.overtime ? "overtime" : ""}>{duration(row.overtime)}</td><td><span className={`attendance-status ${row.status.toLowerCase()}`}>{row.status}</span></td></tr>)}</tbody></table></div></section>}
    {tab === "rotacion" && <Rotation />}
    {tab === "reglas" && <Rules />}
  </div>;
}

function Rotation() {
  const employees = [{name:"Mariana Lopez",group:"Grupo A",afternoon:false,works:true},{name:"Diego Alvarez",group:"Grupo A",afternoon:false,works:true},{name:"Sofia Ramirez",group:"Grupo A",afternoon:true,works:true},{name:"Carlos Gomez",group:"Grupo B",afternoon:false,works:false}];
  return <section className="table-card rotation-card"><div className="section-head"><div><h2>Rotacion quincenal</h2><p>Quienes trabajan el sabado salen una hora antes de lunes a viernes.</p></div></div><div className="rotation-table"><div className="rotation-header">Empleado</div>{["Lun 31","Mar 1","Mie 2","Jue 3","Vie 4","Sab 5"].map((day) => <div className="rotation-header" key={day}>{day}</div>)}{employees.map((employee) => <div className="rotation-row" key={employee.name}><div><strong>{employee.name}</strong><small>{employee.group}</small></div>{[0,1,2,3,4,5].map((day) => <span className={day === 5 ? employee.works ? "works" : "off" : ""} key={day}>{day === 5 ? employee.works ? "08–12" : "Libre" : employee.afternoon ? "14–21" : "07–14"}</span>)}</div>)}</div></section>;
}

function Rules() {
  return <section className="rules-grid"><article className="table-card"><div className="section-head"><div><h2>Reglas activas</h2><p>Orden aplicado a cada jornada importada.</p></div></div><ol className="attendance-rules"><li><b>1</b><div><strong>Asignar el turno mas cercano</strong><p>Compara la entrada con los turnos vigentes del empleado, con tolerancia de dos horas.</p></div></li><li><b>2</b><div><strong>Semana con sabado</strong><p>Reduce una hora de lunes a viernes para el grupo que trabaja ese sabado.</p></div></li><li><b>3</b><div><strong>Sabado asignado</strong><p>Las primeras cuatro horas son normales y todo excedente es extra.</p></div></li><li><b>4</b><div><strong>Sabado libre trabajado</strong><p>La jornada completa se computa como hora extra.</p></div></li></ol></article><aside className="attendance-audit"><span>Control auditable</span><h2>Ninguna duda se oculta</h2><p>Se conservan las marcas originales, el turno elegido y la regla aplicada. Las jornadas incompletas o ambiguas requieren revision.</p></aside></section>;
}
