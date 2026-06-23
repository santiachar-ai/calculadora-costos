import { ModulePage } from "../../components/module-page";
import Link from "next/link";

export default function ReportesPage() {
  return (
    <>
      <ModulePage
        title="Reportes"
        description="Tableros transversales para ventas, stock, compras, produccion y tesoreria."
        highlights={[
          "Dashboard general",
          "Trazabilidad de remitos",
          "Movimientos de stock",
          "Indicadores comerciales",
          "KPIs operativos por modulo",
        ]}
      />
      <div className="page-shell page-shell-tight">
        <section className="panel report-action">
          <div>
            <p className="eyebrow">Nuevo</p>
            <h2>Calculadora de costos</h2>
            <p>
              Importa el XLSX del ERP y calcula costos por litro, rentabilidad
              y punto de equilibrio.
            </p>
          </div>
          <Link className="button" href="/reportes/costos">
            Abrir calculadora
          </Link>
        </section>
      </div>
    </>
  );
}
