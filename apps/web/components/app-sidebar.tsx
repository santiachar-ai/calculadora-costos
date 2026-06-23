"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  title: string;
  href: string;
  subtitle: string;
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    subtitle: "Vista general del ERP",
  },
  {
    title: "Ventas",
    href: "/ventas",
    subtitle: "Clientes, pedidos y facturacion",
  },
  {
    title: "Stock y Depositos",
    href: "/stock",
    subtitle: "Depositos, remitos y movimientos",
  },
  {
    title: "Compras",
    href: "/compras",
    subtitle: "Proveedores y recepciones",
  },
  {
    title: "Produccion",
    href: "/produccion",
    subtitle: "Formulas y ordenes",
  },
  {
    title: "Tesoreria",
    href: "/tesoreria",
    subtitle: "Cajas, bancos y conciliacion",
  },
  {
    title: "Contabilidad",
    href: "/contabilidad",
    subtitle: "Asientos e informes",
  },
  {
    title: "Reportes",
    href: "/reportes",
    subtitle: "KPIs y tableros",
  },
  {
    title: "Maestros",
    href: "/maestros",
    subtitle: "Clientes, productos y definiciones",
  },
  {
    title: "Administracion",
    href: "/administracion",
    subtitle: "Usuarios y configuracion",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-mark">EP</div>
        <div>
          <div className="sidebar-label">ERP Propio</div>
          <div className="sidebar-subtitle">Operacion y trazabilidad</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              className={`nav-link ${isActive ? "active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span className="nav-title">{item.title}</span>
              <span className="nav-subtitle">{item.subtitle}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-foot-card">
          <strong>Prioridad actual</strong>
          <span>Remitos multi-deposito y stock por deposito</span>
        </div>
      </div>
    </aside>
  );
}
