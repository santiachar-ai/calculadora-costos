import Link from "next/link";

import { getDashboardData } from "../lib/api";

export default async function HomePage() {
  const data = await getDashboardData();

  const totalStock = data.stockBalances.reduce(
    (sum, balance) => sum + Number(balance.quantityOnHand),
    0,
  );

  return (
    <div className="page-shell">
      <section className="hero">
        <article className="hero-card">
          <p className="eyebrow">ERP Propio</p>
          <h1>Una base operativa pensada para reemplazar dolores reales.</h1>
          <p>
            Empezamos por el punto mas critico de tu operacion: remitos con
            salida real desde multiples depositos, trazabilidad exacta y stock
            confiable.
          </p>
          <div className="badge-row">
            <div className="badge">
              <strong>Ventas</strong>
              Pedidos, remitos y facturacion listos para crecer.
            </div>
            <div className="badge">
              <strong>Stock y Depositos</strong>
              Flujo principal ya operable desde la web.
            </div>
            <div className="badge">
              <strong>Produccion</strong>
              Listas de materiales y ordenes como siguiente etapa.
            </div>
          </div>
          <div className="actions">
            <Link className="button" href="/stock">
              Ir a Stock y Depositos
            </Link>
            <Link className="button-secondary" href="/ventas">
              Ver estructura de modulos
            </Link>
          </div>
        </article>

        <div className="stats-row">
          <div className="hero-card metric">
            <div className="label">Productos activos</div>
            <div className="value">{data.products.length}</div>
          </div>
          <div className="hero-card metric">
            <div className="label">Stock disponible</div>
            <div className="value">{totalStock}</div>
          </div>
          <div className="hero-card metric">
            <div className="label">Remitos cargados</div>
            <div className="value">{data.deliveryNotes.length}</div>
          </div>
        </div>
      </section>

      <section className="module-grid">
        <article className="panel">
          <h2>Estado del MVP</h2>
          <p>
            La base tecnica ya esta levantada con API, migracion local, seed de
            prueba y una primera interfaz web navegable.
          </p>
        </article>
        <article className="panel">
          <h2>Prioridad funcional</h2>
          <p>
            La navegacion ya refleja los modulos principales del ERP actual de
            tu empresa, pero con una estructura mas clara para crecer.
          </p>
        </article>
        <article className="panel">
          <h2>Proximo paso sugerido</h2>
          <p>
            Profundizar Stock y Ventas, y despues sumar Compras y Produccion
            sobre el mismo layout.
          </p>
        </article>
      </section>
    </div>
  );
}
