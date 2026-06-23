"use client";

import { useMemo, useState, useTransition } from "react";

import {
  confirmDeliveryNoteAction,
  createDeliveryNoteAction,
  refreshDashboardAction,
} from "../lib/actions";
import { tankDefinitions } from "../lib/tank-config";
import { DashboardData, DeliveryNoteTraceability } from "../lib/types";
import { StockSubnav, StockSection } from "./stock/stock-subnav";
import { StockTankCard } from "./stock/stock-tank-card";
import { StockBalanceRow, StockMovementRow } from "./stock/stock-tables";

type DashboardClientProps = {
  initialData: DashboardData;
};

type AllocationDraft = {
  warehouseId: string;
  quantity: number;
};

type ItemDraft = {
  productId: string;
  quantity: number;
  allocations: AllocationDraft[];
};

const initialRemitoState: ItemDraft[] = [
  {
    productId: "",
    quantity: 10,
    allocations: [
      { warehouseId: "", quantity: 6 },
      { warehouseId: "", quantity: 4 },
    ],
  },
  {
    productId: "",
    quantity: 5,
    allocations: [{ warehouseId: "", quantity: 5 }],
  },
];

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [activeSection, setActiveSection] = useState<StockSection>("overview");
  const [noteNumber, setNoteNumber] = useState("R-000001");
  const [deliveryDate, setDeliveryDate] = useState("2026-03-11T10:00");
  const [items, setItems] = useState<ItemDraft[]>(initialRemitoState);
  const [selectedTraceId, setSelectedTraceId] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [traceability, setTraceability] =
    useState<DeliveryNoteTraceability | null>(null);
  const [isPending, startTransition] = useTransition();

  const products = data.products;
  const warehouses = data.warehouses;
  const customer = data.customers[0];
  const user = data.users[0];

  const totalStock = data.stockBalances.reduce(
    (sum, balance) => sum + Number(balance.quantityOnHand),
    0,
  );

  const totalReserved = data.stockBalances.reduce(
    (sum, balance) => sum + Number(balance.quantityReserved ?? 0),
    0,
  );

  const warehouseSummary = useMemo(() => {
    return data.warehouses.map((warehouse) => {
      const balances = data.stockBalances.filter(
        (balance) => balance.warehouse.id === warehouse.id,
      );
      const total = balances.reduce(
        (sum, balance) => sum + Number(balance.quantityOnHand),
        0,
      );

      return {
        warehouse,
        skuCount: balances.length,
        total,
      };
    });
  }, [data.stockBalances, data.warehouses]);

  const tankStatus = useMemo(() => {
    return tankDefinitions.map((tank) => {
      const balances = data.stockBalances.filter(
        (balance) => balance.warehouse.code === tank.code,
      );
      const currentLiters = balances.reduce(
        (sum, balance) => sum + Number(balance.quantityOnHand),
        0,
      );
      const fillPercent = Math.min(
        100,
        Math.round((currentLiters / tank.capacityLiters) * 100),
      );

      let statusLabel = "Bajo";

      if (fillPercent >= 75) {
        statusLabel = "Alto";
      } else if (fillPercent >= 35) {
        statusLabel = "Medio";
      }

      return {
        tank,
        currentLiters,
        fillPercent,
        statusLabel,
        productName: balances[0]?.product.name ?? tank.baseProductName,
      };
    });
  }, [data.stockBalances]);

  function updateItem(index: number, next: Partial<ItemDraft>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...next } : item,
      ),
    );
  }

  function updateAllocation(
    itemIndex: number,
    allocationIndex: number,
    next: Partial<AllocationDraft>,
  ) {
    setItems((current) =>
      current.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) {
          return item;
        }

        return {
          ...item,
          allocations: item.allocations.map((allocation, currentAllocationIndex) =>
            currentAllocationIndex === allocationIndex
              ? { ...allocation, ...next }
              : allocation,
          ),
        };
      }),
    );
  }

  function resetForm() {
    setNoteNumber(`R-${String(data.deliveryNotes.length + 1).padStart(6, "0")}`);
    setItems(
      initialRemitoState.map((item) => ({
        ...item,
        productId: "",
        allocations: item.allocations.map((allocation) => ({
          ...allocation,
          warehouseId: "",
        })),
      })),
    );
  }

  async function refreshData(traceId?: string) {
    const nextData = await refreshDashboardAction();
    setData(nextData);

    if (traceId) {
      const nextTrace = nextData.deliveryNotes.find((note) => note.id === traceId);
      if (nextTrace) {
        setSelectedTraceId(traceId);
        setTraceability(nextTrace);
      }
    }
  }

  function handleCreateDeliveryNote() {
    if (!customer || !user) {
      setMessage({
        type: "error",
        text: "No hay datos base cargados. Ejecuta el seed primero.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const created = await createDeliveryNoteAction({
          number: noteNumber,
          customerId: customer.id,
          deliveryDate: new Date(deliveryDate).toISOString(),
          createdByUserId: user.id,
          items,
        });

        setMessage({
          type: "success",
          text: `Remito ${created.number} creado correctamente.`,
        });
        setSelectedTraceId(created.id);
        setTraceability(null);
        setActiveSection("delivery-notes");
        await refreshData(created.id);
        resetForm();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "No se pudo crear el remito.",
        });
      }
    });
  }

  function handleConfirmDeliveryNote(id: string) {
    if (!user) {
      setMessage({
        type: "error",
        text: "No hay usuario disponible para confirmar.",
      });
      return;
    }

    startTransition(async () => {
      try {
        const confirmed = await confirmDeliveryNoteAction(id, user.id);
        setMessage({
          type: "success",
          text: `Remito ${confirmed.number} confirmado y descontado de stock.`,
        });
        setSelectedTraceId(confirmed.id);
        setTraceability(confirmed);
        setActiveSection("movements");
        await refreshData(confirmed.id);
      } catch (error) {
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "No se pudo confirmar el remito.",
        });
      }
    });
  }

  function handleSelectTraceability(id: string) {
    const selected = data.deliveryNotes.find((note) => note.id === id) ?? null;
    setSelectedTraceId(id);
    setTraceability(selected);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <article className="hero-card">
          <p className="eyebrow">Stock y Depositos</p>
          <h1>Operacion de almacenes con remitos trazables por deposito real.</h1>
          <p>
            Este modulo ya refleja el flujo central del negocio: stock por
            deposito, remitos multi-deposito, movimientos y trazabilidad sin
            correcciones manuales posteriores.
          </p>
          <div className="badge-row">
            <div className="badge">
              <strong>Depositos activos</strong>
              {data.warehouses.length} operativos en el entorno de prueba.
            </div>
            <div className="badge">
              <strong>Stock disponible</strong>
              {totalStock} unidades distribuidas entre depositos.
            </div>
            <div className="badge">
              <strong>Movimientos registrados</strong>
              {data.stockMovements.length} lineas de auditoria de inventario.
            </div>
          </div>
        </article>

        <div className="stats-row">
          <div className="hero-card metric">
            <div className="label">Remitos</div>
            <div className="value">{data.deliveryNotes.length}</div>
          </div>
          <div className="hero-card metric">
            <div className="label">Stock disponible</div>
            <div className="value">{totalStock}</div>
          </div>
          <div className="hero-card metric">
            <div className="label">Reservado</div>
            <div className="value">{totalReserved}</div>
          </div>
        </div>
      </section>

      <section className="stock-layout">
        <StockSubnav
          activeSection={activeSection}
          customerName={customer?.businessName}
          userName={user?.name}
          onChange={setActiveSection}
        />

        <div className="stock-main">
          {message ? (
            <div className={`message ${message.type}`}>{message.text}</div>
          ) : null}

          {activeSection === "overview" ? (
            <section className="module-grid">
              <article className="panel">
                <h2>Resumen de stock</h2>
                <p>
                  El stock actual se distribuye por deposito y ya permite
                  descontar desde multiples origenes en un mismo remito.
                </p>
              </article>
              <article className="panel">
                <h2>Control documental</h2>
                <p>
                  Los remitos draft pueden confirmarse y generar movimientos de
                  salida con referencia directa al documento origen.
                </p>
              </article>
              <article className="panel">
                <h2>Proximas piezas</h2>
                <p>
                  Transferencias, ingresos de mercaderia, toma de inventario y
                  ordenes internas de deposito.
                </p>
              </article>

              <article className="table-card full-span">
                <h2>Estado de tanques</h2>
                <p>
                  Vista visual de los tanques fisicos con su producto base y
                  porcentaje estimado de ocupacion.
                </p>
                <div className="tank-grid">
                  {tankStatus.map((entry) => (
                    <StockTankCard
                      key={entry.tank.code}
                      name={entry.tank.name}
                      productName={entry.productName}
                      currentLiters={entry.currentLiters}
                      capacityLiters={entry.tank.capacityLiters}
                      fillPercent={entry.fillPercent}
                      statusLabel={entry.statusLabel}
                      notes={entry.tank.commercialNames?.join(" / ")}
                    />
                  ))}
                </div>
              </article>

              <article className="table-card full-span">
                <h2>Stock por deposito</h2>
                <p>Balance consolidado del entorno de prueba.</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Deposito</th>
                        <th>Producto</th>
                        <th>Disponible</th>
                        <th>Reservado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stockBalances.map((balance) => (
                        <StockBalanceRow key={balance.id} balance={balance} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ) : null}

          {activeSection === "delivery-notes" ? (
            <>
              <section className="content-grid">
                <article className="form-card">
                  <h2>Crear remito multi-deposito</h2>
                  <p>
                    Carga el remito y define desde que deposito sale cada parte
                    del item.
                  </p>

                  <div className="form-grid">
                    <div className="field">
                      <label>Numero de remito</label>
                      <input
                        value={noteNumber}
                        onChange={(event) => setNoteNumber(event.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Fecha de entrega</label>
                      <input
                        type="datetime-local"
                        value={deliveryDate}
                        onChange={(event) => setDeliveryDate(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="allocation-list">
                    {items.map((item, itemIndex) => (
                      <div className="allocation-item" key={`item-${itemIndex}`}>
                        <div className="form-grid">
                          <div className="field">
                            <label>Producto</label>
                            <select
                              value={item.productId}
                              onChange={(event) =>
                                updateItem(itemIndex, {
                                  productId: event.target.value,
                                })
                              }
                            >
                              <option value="">Seleccionar</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="field">
                            <label>Cantidad remitida</label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(itemIndex, {
                                  quantity: Number(event.target.value),
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="allocation-list">
                          {item.allocations.map((allocation, allocationIndex) => (
                            <div
                              className="allocation-item nested-card"
                              key={`allocation-${itemIndex}-${allocationIndex}`}
                            >
                              <div className="form-grid">
                                <div className="field">
                                  <label>Deposito origen</label>
                                  <select
                                    value={allocation.warehouseId}
                                    onChange={(event) =>
                                      updateAllocation(itemIndex, allocationIndex, {
                                        warehouseId: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Seleccionar</option>
                                    {warehouses.map((warehouse) => (
                                      <option
                                        key={warehouse.id}
                                        value={warehouse.id}
                                      >
                                        {warehouse.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="field">
                                  <label>Cantidad desde este deposito</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={allocation.quantity}
                                    onChange={(event) =>
                                      updateAllocation(itemIndex, allocationIndex, {
                                        quantity: Number(event.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="actions">
                    <button
                      className="button"
                      onClick={handleCreateDeliveryNote}
                      disabled={isPending}
                    >
                      {isPending ? "Guardando..." : "Crear remito"}
                    </button>
                    <button
                      className="button-secondary"
                      onClick={resetForm}
                      disabled={isPending}
                    >
                      Resetear formulario
                    </button>
                  </div>
                </article>

                <article className="table-card">
                  <h2>Remitos cargados</h2>
                  <p>Documentos disponibles para inspeccionar o confirmar.</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Numero</th>
                          <th>Cliente</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.deliveryNotes.map((note) => (
                          <tr key={note.id}>
                            <td>{note.number}</td>
                            <td>{note.customer.businessName}</td>
                            <td>
                              <span className="status-pill">{note.status}</span>
                            </td>
                            <td>
                              <div className="actions">
                                <button
                                  className="button-secondary"
                                  onClick={() => handleSelectTraceability(note.id)}
                                >
                                  Ver
                                </button>
                                {note.status === "DRAFT" ? (
                                  <button
                                    className="button"
                                    onClick={() => handleConfirmDeliveryNote(note.id)}
                                    disabled={isPending}
                                  >
                                    Confirmar
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>

              <section className="content-grid">
                <article className="table-card full-span">
                  <h2>Trazabilidad del remito</h2>
                  <p>
                    Selecciona un remito para ver desde que depositos salio cada
                    item.
                  </p>

                  {traceability ? (
                    <div className="trace-list">
                      <div className="trace-item">
                        <strong>
                          {traceability.number} · {traceability.customer.businessName}
                        </strong>
                        <span className="status-pill">{traceability.status}</span>
                      </div>

                      {traceability.items.map((item) => (
                        <div className="trace-item" key={item.id}>
                          <strong>{item.product.name}</strong>
                          <div>Cantidad remitida: {Number(item.quantity)}</div>
                          <div className="allocation-list">
                            {item.allocations.map((allocation) => (
                              <div className="allocation-item" key={allocation.id}>
                                <div>Deposito: {allocation.warehouse.name}</div>
                                <div>Cantidad: {Number(allocation.quantity)}</div>
                                <div>
                                  Movimiento:{" "}
                                  {allocation.stockMovement
                                    ? allocation.stockMovement.id
                                    : "Pendiente"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : selectedTraceId ? (
                    <div className="empty-state">
                      El remito fue seleccionado, pero todavia no hay
                      trazabilidad refrescada.
                    </div>
                  ) : (
                    <div className="empty-state">
                      Todavia no seleccionaste ningun remito.
                    </div>
                  )}
                </article>
              </section>
            </>
          ) : null}

          {activeSection === "movements" ? (
            <section className="content-grid">
              <article className="table-card full-span">
                <h2>Movimientos de stock</h2>
                <p>
                  Registro cronologico de ingresos y salidas con documento
                  origen.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Direccion</th>
                        <th>Deposito</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Documento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stockMovements.map((movement) => (
                        <StockMovementRow
                          key={movement.id}
                          movement={movement}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ) : null}

          {activeSection === "warehouses" ? (
            <section className="module-grid">
              {warehouseSummary.map((entry) => (
                <article className="panel" key={entry.warehouse.id}>
                  <h2>{entry.warehouse.name}</h2>
                  <p>Codigo: {entry.warehouse.code}</p>
                  <p>Tipo: {entry.warehouse.type ?? "Sin clasificar"}</p>
                  <p>SKUs con saldo: {entry.skuCount}</p>
                  <p>Total disponible: {entry.total}</p>
                </article>
              ))}

              <article className="table-card full-span">
                <h2>Mapa de tanques</h2>
                <p>
                  Cada tanque opera como deposito fisico y normalmente queda
                  asociado a un producto base determinado.
                </p>
                <div className="tank-grid">
                  {tankStatus.map((entry) => (
                    <StockTankCard
                      key={entry.tank.code}
                      name={entry.tank.name}
                      productName={entry.productName}
                      currentLiters={entry.currentLiters}
                      capacityLiters={entry.tank.capacityLiters}
                      fillPercent={entry.fillPercent}
                      statusLabel={entry.statusLabel}
                      notes={entry.tank.commercialNames?.join(" / ")}
                    />
                  ))}
                </div>
              </article>

              <article className="table-card full-span">
                <h2>Balance por deposito</h2>
                <p>Detalle actual por producto y deposito.</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Deposito</th>
                        <th>Producto</th>
                        <th>Disponible</th>
                        <th>Reservado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.stockBalances.map((balance) => (
                        <StockBalanceRow key={balance.id} balance={balance} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          ) : null}

          {activeSection === "inventory" ? (
            <section className="module-grid">
              <article className="panel">
                <h2>Toma de inventario</h2>
                <p>
                  Pendiente de implementacion. Aca van a vivir los conteos por
                  deposito, ajustes y diferencias fisicas.
                </p>
              </article>
              <article className="panel">
                <h2>Transferencias internas</h2>
                <p>
                  Proxima pieza para resolver movimientos entre depositos sin
                  romper la trazabilidad.
                </p>
              </article>
              <article className="panel">
                <h2>Ordenes de mercaderia</h2>
                <p>
                  Espacio futuro para picking, reposicion y ordenes internas del
                  almacen.
                </p>
              </article>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
