"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

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

const demoRows: Row[] = [
  { id: 1, employee: "Mariana Lopez", area: "Administracion", date: "04/09", day: "Viernes", punches: ["06:57", "14:05"], shift: "Manana · semana con sabado", schedule: "07:00–14:00", worked: 428, regular: 420, overtime: 8, status: "Correcto" },
  { id: 2, employee: "Diego Alvarez", area: "Deposito", date: "04/09", day: "Viernes", punches: ["07:03", "12:01", "12:42", "15:38"], shift: "Deposito · semana con sabado", schedule: "07:00–14:00", worked: 474, regular: 420, overtime: 54, status: "Correcto" },
  { id: 3, employee: "Sofia Ramirez", area: "Produccion", date: "04/09", day: "Viernes", punches: ["13:56", "22:11"], shift: "Tarde · semana con sabado", schedule: "14:00–21:00", worked: 495, regular: 420, overtime: 75, status: "Correcto" },
  { id: 4, employee: "Martin Benitez", area: "Produccion", date: "04/09", day: "Viernes", punches: ["05:49"], shift: "Sin asignar", schedule: "—", worked: null, regular: 0, overtime: 0, status: "Incompleto", note: "Falta la marcacion de salida" },
  { id: 5, employee: "Lucia Fernandez", area: "Logistica", date: "05/09", day: "Sabado", punches: ["07:58", "12:32"], shift: "Sabado alterno asignado", schedule: "08:00–12:00", worked: 274, regular: 240, overtime: 34, status: "Correcto" },
  { id: 6, employee: "Carlos Gomez", area: "Deposito", date: "05/09", day: "Sabado", punches: ["08:06", "11:51"], shift: "Sabado libre", schedule: "No correspondia", worked: 225, regular: 0, overtime: 225, status: "Revisar", note: "Toda la jornada se computa como extra" },
];

const saturdayGroupA = new Set(["oscar", "fernando", "axel", "franco"]);
const saturdayAnchor = new Date(2026, 7, 1);

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function parseDate(value: string) {
  const parts = value.trim().split(/[\/-]/).map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [first, second, third] = parts;
  const date = first > 1900 ? new Date(first, second - 1, third) : new Date(third, second - 1, first);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMinutes(value: string) {
  const [hours, minutes] = value.trim().split(":").map(Number);
  return hours * 60 + minutes;
}

function workedMinutes(punches: string[]) {
  let total = 0;
  for (let index = 0; index < punches.length; index += 2) {
    const start = parseMinutes(punches[index]);
    const end = parseMinutes(punches[index + 1]);
    total += end >= start ? end - start : end + 1440 - start;
  }
  return total;
}

function isAssignedSaturday(employee: string, date: Date) {
  if (date.getDay() !== 6) return false;
  const elapsedDays = Math.round((date.getTime() - saturdayAnchor.getTime()) / 86_400_000);
  if (elapsedDays < 0 || elapsedDays % 7 !== 0) return false;
  const groupAWorks = elapsedDays % 14 === 0;
  return saturdayGroupA.has(normalize(employee)) ? groupAWorks : !groupAWorks;
}

function weekdayTarget(employee: string, date: Date) {
  const weekday = date.getDay();
  if (weekday < 1 || weekday > 5) return null;
  if (weekday === 5) return { minutes: 540, worksSaturday: isAssignedSaturday(employee, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) };
  const saturday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (6 - weekday));
  const worksSaturday = isAssignedSaturday(employee, saturday);
  return { minutes: worksSaturday ? 540 : 600, worksSaturday };
}

function importedRows(matrix: unknown[][]): Row[] {
  const headerIndex = matrix.findIndex((row) => row.some((cell) => String(cell).trim() === "Employee ID") && row.some((cell) => String(cell).trim() === "Date"));
  if (headerIndex < 0) throw new Error("No se encontraron las columnas de transacciones de BioTime.");
  const headers = matrix[headerIndex].map((value) => String(value).trim());
  const column = (name: string) => headers.indexOf(name);
  const employeeColumn = column("Employee ID"), nameColumn = column("First Name"), departmentColumn = column("Department"), dateColumn = column("Date"), timeColumn = column("Time");
  if ([employeeColumn, dateColumn, timeColumn].some((index) => index < 0)) throw new Error("El archivo no tiene el formato de BioTime esperado.");
  const grouped = new Map<string, { employeeId: string; employee: string; area: string; dateText: string; date: Date; punches: string[] }>();
  for (const raw of matrix.slice(headerIndex + 1)) {
    const employeeId = String(raw[employeeColumn] ?? "").trim();
    const dateText = String(raw[dateColumn] ?? "").trim();
    const date = parseDate(dateText);
    const time = String(raw[timeColumn] ?? "").trim().slice(0, 5);
    if (!employeeId || !date || !/^\d{1,2}:\d{2}$/.test(time)) continue;
    const key = `${normalize(employeeId)}|${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const current = grouped.get(key) ?? { employeeId, employee: String(raw[nameColumn] || employeeId).trim(), area: String(raw[departmentColumn] || "Sin sector").trim(), dateText, date, punches: [] };
    if (!current.punches.includes(time)) current.punches.push(time);
    grouped.set(key, current);
  }
  return [...grouped.values()].sort((a, b) => b.date.getTime() - a.date.getTime() || a.employee.localeCompare(b.employee, "es")).map((group, index) => {
    const punches = group.punches.sort((a, b) => parseMinutes(a) - parseMinutes(b));
    const complete = punches.length >= 2 && punches.length % 2 === 0;
    const worked = complete ? workedMinutes(punches) : null;
    const isSaturday = group.date.getDay() === 6;
    const assigned = isAssignedSaturday(group.employeeId, group.date);
    const weekdaySchedule = weekdayTarget(group.employeeId, group.date);
    const targetMinutes = isSaturday ? assigned ? 240 : 0 : weekdaySchedule?.minutes ?? 0;
    const regular = worked === null ? 0 : weekdaySchedule || isSaturday ? Math.min(worked, targetMinutes) : 0;
    const overtime = worked === null ? 0 : weekdaySchedule || isSaturday ? Math.max(0, worked - targetMinutes) : 0;
    const displayDate = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(group.date);
    return {
      id: index + 1, employee: group.employee, area: group.area, date: displayDate,
      day: new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(group.date), punches, worked, regular, overtime,
      shift: isSaturday ? assigned ? "Sábado alterno asignado" : "Sábado libre" : weekdaySchedule ? weekdaySchedule.worksSaturday ? "Semana con sábado" : "Semana sin sábado" : "Día no configurado",
      schedule: isSaturday ? assigned ? "Primeras 4 h normales" : "No correspondía" : weekdaySchedule ? `${weekdaySchedule.minutes / 60} h normales` : "Sin horario asignado",
      status: !complete ? "Incompleto" : weekdaySchedule || isSaturday ? "Correcto" : "Revisar",
      note: !complete ? "Cantidad impar de marcaciones" : isSaturday ? assigned ? "El excedente de 4 horas se computa como extra" : "Toda la jornada se computa como extra" : weekdaySchedule ? `El excedente de ${weekdaySchedule.minutes / 60} horas se computa como extra` : "La jornada requiere revisión manual",
    } satisfies Row;
  });
}

function duration(minutes: number | null) {
  if (minutes === null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours ? `${hours} h` : ""}${rest ? ` ${rest} min` : ""}`.trim() || "0 h";
}

export function AttendanceClient() {
  const [rows, setRows] = useState<Row[]>(demoRows);
  const [tab, setTab] = useState<"detalle" | "rotacion" | "reglas">("detalle");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "Todos">("Todos");
  const [updated, setUpdated] = useState(false);
  const [importMessage, setImportMessage] = useState("Datos de demostración");
  const fileInput = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => rows.filter((row) => `${row.employee} ${row.area}`.toLowerCase().includes(query.toLowerCase()) && (status === "Todos" || row.status === status)), [query, status]);
  const totalWorked = rows.reduce((sum, row) => sum + (row.worked ?? 0), 0);
  const totalOvertime = rows.reduce((sum, row) => sum + row.overtime, 0);
  const issues = rows.filter((row) => row.status !== "Correcto").length;
  const employees = new Set(rows.map((row) => normalize(row.employee))).size;

  function recalculate() {
    setUpdated(true);
    window.setTimeout(() => setUpdated(false), 1600);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
      const parsed = importedRows(matrix);
      if (!parsed.length) throw new Error("El archivo no contiene marcaciones válidas.");
      setRows(parsed);
      setImportMessage(`${file.name} · ${parsed.length} jornadas · ${new Set(parsed.map((row) => normalize(row.employee))).size} empleados`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    } finally {
      event.target.value = "";
    }
  }

  return <div className="page-shell attendance-page">
    <section className="attendance-heading">
      <div><p className="eyebrow">Personal / Horas y asistencia</p><h1>Control de horas</h1><p>Asigna las marcaciones de BioTime al turno mas probable y separa horas normales y extras.</p></div>
      <div className="attendance-actions"><input ref={fileInput} className="attendance-file" type="file" accept=".xlsx,.xls,.csv" onChange={importFile} /><button className="button-secondary" type="button" onClick={() => fileInput.current?.click()}>Importar Excel o CSV</button><button className="button" type="button" onClick={recalculate}>{updated ? "Cálculo actualizado" : "Recalcular"}</button></div>
    </section>

    <section className="attendance-period"><div><span>Origen</span><strong>Archivo de marcaciones</strong></div><div className="biotime-state manual"><i /> <span><strong>Importación manual</strong><small>{importMessage}</small></span></div></section>

    <section className="attendance-kpis"><article><span>Empleados</span><strong>{employees}</strong><small>Con marcaciones visibles</small></article><article><span>Horas trabajadas</span><strong>{duration(totalWorked)}</strong><small>Archivo importado</small></article><article><span>Horas extra</span><strong>{duration(totalOvertime)}</strong><small>Sábados ya configurados</small></article><article className="attention"><span>Para revisar</span><strong>{issues}</strong><small>Turnos o marcas incompletas</small></article></section>

    <div className="attendance-tabs"><button className={tab === "detalle" ? "active" : ""} onClick={() => setTab("detalle")}>Asistencia semanal</button><button className={tab === "rotacion" ? "active" : ""} onClick={() => setTab("rotacion")}>Turnos rotativos</button><button className={tab === "reglas" ? "active" : ""} onClick={() => setTab("reglas")}>Reglas de calculo</button></div>

    {tab === "detalle" && <section className="table-card attendance-table-card"><div className="section-head"><div><h2>Detalle de marcaciones</h2><p>Las jornadas dudosas quedan pendientes para revision manual.</p></div><div className="attendance-filters"><input aria-label="Buscar empleado" placeholder="Buscar empleado..." value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar estado" value={status} onChange={(event) => setStatus(event.target.value as Status | "Todos")}><option>Todos</option><option>Correcto</option><option>Revisar</option><option>Incompleto</option></select></div></div><div className="table-wrap"><table><thead><tr><th>Empleado</th><th>Dia</th><th>Marcaciones</th><th>Turno asignado</th><th>Trabajado</th><th>Normales</th><th>Extras</th><th>Estado</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><strong>{row.employee}</strong><small>{row.area}</small></td><td><strong>{row.date}</strong><small>{row.day}</small></td><td><div className="punch-list">{row.punches.map((punch) => <span key={punch}>{punch}</span>)}</div>{row.note && <small className="attendance-note">{row.note}</small>}</td><td><strong>{row.shift}</strong><small>{row.schedule}</small></td><td>{duration(row.worked)}</td><td>{duration(row.regular)}</td><td className={row.overtime ? "overtime" : ""}>{duration(row.overtime)}</td><td><span className={`attendance-status ${row.status.toLowerCase()}`}>{row.status}</span></td></tr>)}</tbody></table></div></section>}
    {tab === "rotacion" && <Rotation />}
    {tab === "reglas" && <Rules />}
  </div>;
}

function Rotation() {
  const groups = [
    { employees: "Oscar, Fernando, Axel y Franco", group: "Grupo A", worksFirst: true },
    { employees: "Resto de los empleados", group: "Grupo B", worksFirst: false },
  ];
  const saturdays = [{ label: "Sáb 1", works: true }, { label: "Sáb 8", works: false }, { label: "Sáb 15", works: true }, { label: "Sáb 22", works: false }, { label: "Sáb 29", works: true }];
  return <section className="table-card rotation-card"><div className="section-head"><div><h2>Rotación de agosto 2026</h2><p>Los dos grupos se alternan todos los sábados y cada empleado trabaja sábado por medio.</p></div></div><div className="rotation-table"><div className="rotation-header">Grupo</div>{saturdays.map((day) => <div className="rotation-header" key={day.label}>{day.label}</div>)}{groups.map((item) => <div className="rotation-row" key={item.group}><div><strong>{item.employees}</strong><small>{item.group}</small></div>{saturdays.map((day) => { const works = day.works === item.worksFirst; return <span className={works ? "works" : "off"} key={day.label}>{works ? "Trabaja 4 h" : "Libre"}</span>; })}</div>)}</div><p className="attendance-rotation-note">Lunes a jueves: 9 h para el grupo que trabaja ese sábado y 10 h para el grupo que descansa. Los viernes siempre corresponden 9 h.</p></section>;
}

function Rules() {
  return <section className="rules-grid"><article className="table-card"><div className="section-head"><div><h2>Reglas activas</h2><p>Orden aplicado a cada jornada importada.</p></div></div><ol className="attendance-rules"><li><b>1</b><div><strong>Lunes a jueves con sábado</strong><p>El grupo que trabaja el sábado de esa semana tiene 9 horas normales por día.</p></div></li><li><b>2</b><div><strong>Lunes a jueves sin sábado</strong><p>El grupo que tiene el sábado libre tiene 10 horas normales por día.</p></div></li><li><b>3</b><div><strong>Viernes</strong><p>Todos los empleados tienen siempre 9 horas normales.</p></div></li><li><b>4</b><div><strong>Sábado asignado</strong><p>Las primeras cuatro horas son normales y todo excedente es extra.</p></div></li><li><b>5</b><div><strong>Sábado libre trabajado</strong><p>La jornada completa se computa como hora extra.</p></div></li></ol></article><aside className="attendance-audit"><span>Control auditable</span><h2>Ninguna duda se oculta</h2><p>Se conservan las marcas originales, el turno elegido y la regla aplicada. Las jornadas incompletas o ambiguas requieren revisión.</p></aside></section>;
}
