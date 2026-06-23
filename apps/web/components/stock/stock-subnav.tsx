"use client";

export type StockSection =
  | "overview"
  | "delivery-notes"
  | "movements"
  | "warehouses"
  | "inventory";

type StockSubnavProps = {
  activeSection: StockSection;
  customerName?: string;
  userName?: string;
  onChange: (section: StockSection) => void;
};

const sectionLabels: { id: StockSection; title: string; subtitle: string }[] = [
  { id: "overview", title: "Resumen", subtitle: "Estado operativo del modulo" },
  {
    id: "delivery-notes",
    title: "Remitos",
    subtitle: "Creacion, confirmacion y trazabilidad",
  },
  { id: "movements", title: "Movimientos", subtitle: "Salidas e ingresos" },
  { id: "warehouses", title: "Depositos", subtitle: "Capacidad operativa" },
  { id: "inventory", title: "Inventario", subtitle: "Control y proximos pasos" },
];

export function StockSubnav({
  activeSection,
  customerName,
  userName,
  onChange,
}: StockSubnavProps) {
  return (
    <aside className="stock-subnav">
      <div className="subnav-head">
        <h2>Almacenes</h2>
        <p>Vista modular del flujo operativo del inventario.</p>
      </div>

      <div className="subnav-links">
        {sectionLabels.map((section) => (
          <button
            className={`subnav-link ${activeSection === section.id ? "active" : ""}`}
            key={section.id}
            onClick={() => onChange(section.id)}
            type="button"
          >
            <span>{section.title}</span>
            <small>{section.subtitle}</small>
          </button>
        ))}
      </div>

      <div className="sidebar-foot-card">
        <strong>Datos de prueba</strong>
        <span>Usuario: {userName ?? "Sin seed"}</span>
        <span>Cliente demo: {customerName ?? "Sin seed"}</span>
      </div>
    </aside>
  );
}
