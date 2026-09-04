"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type OrderStatus = "BORRADOR" | "CONFIRMADO" | "PREPARACION" | "DESPACHADO" | "CANCELADO";
type OrderUnit = "L" | "KG" | "TN" | "UN" | "IBC" | "BIDON";

type OrderItem = {
  id: string;
  articulo: string;
  cantidad: number;
  unidad: OrderUnit;
  observaciones: string;
};

type Order = {
  id: string;
  numero: string;
  cliente: string;
  fechaPedido: string;
  fechaEntrega: string;
  transporte: string;
  chofer: string;
  telefono: string;
  documento: string;
  licencia: string;
  patente: string;
  observaciones: string;
  estado: OrderStatus;
  remitoBorradorId: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

type OrderFormState = Omit<Order, "id" | "numero" | "createdAt" | "updatedAt" | "remitoBorradorId">;

const STORAGE_KEY = "erp-orders-v1";

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "CONFIRMADO", label: "Confirmado" },
  { value: "PREPARACION", label: "En preparacion" },
  { value: "DESPACHADO", label: "Despachado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const unitOptions: OrderUnit[] = ["L", "KG", "TN", "UN", "IBC", "BIDON"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function emptyItem(): OrderItem {
  return {
    id: crypto.randomUUID(),
    articulo: "",
    cantidad: 0,
    unidad: "L",
    observaciones: "",
  };
}

function emptyForm(): OrderFormState {
  const today = todayIso();

  return {
    cliente: "",
    fechaPedido: today,
    fechaEntrega: today,
    transporte: "",
    chofer: "",
    telefono: "",
    documento: "",
    licencia: "",
    patente: "",
    observaciones: "",
    estado: "CONFIRMADO",
    items: [emptyItem()],
  };
}

function nextOrderNumber(orders: Order[]) {
  const next = orders.length + 1;
  return `PED-${String(next).padStart(5, "0")}`;
}

function statusLabel(status: OrderStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function formatDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function number(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function orderUnitsSummary(order: Order) {
  const totals = new Map<OrderUnit, number>();
  order.items.forEach((item) => {
    totals.set(item.unidad, (totals.get(item.unidad) ?? 0) + item.cantidad);
  });

  return Array.from(totals.entries())
    .map(([unit, value]) => `${number(value)} ${unit}`)
    .join(" / ");
}

export function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<OrderFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "TODOS">("TODOS");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const needle = normalize(query);

    return orders.filter((order) => {
      const matchesQuery =
        !needle ||
        normalize(
          [
            order.numero,
            order.cliente,
            order.transporte,
            order.chofer,
            order.patente,
            ...order.items.map((item) => item.articulo),
          ].join(" "),
        ).includes(needle);
      const matchesStatus = statusFilter === "TODOS" || order.estado === statusFilter;
      const matchesFrom = !deliveryFrom || order.fechaEntrega >= deliveryFrom;
      const matchesTo = !deliveryTo || order.fechaEntrega <= deliveryTo;

      return matchesQuery && matchesStatus && matchesFrom && matchesTo;
    });
  }, [deliveryFrom, deliveryTo, orders, query, statusFilter]);

  const dashboard = useMemo(() => {
    const today = todayIso();
    const weekTo = addDaysIso(new Date(), 7);
    const activeOrders = orders.filter((order) => order.estado !== "CANCELADO");
    const pendingOrders = activeOrders.filter((order) => order.estado !== "DESPACHADO");
    const liters = activeOrders.reduce(
      (total, order) =>
        total +
        order.items.reduce((itemTotal, item) => itemTotal + (item.unidad === "L" ? item.cantidad : 0), 0),
      0,
    );
    const tons = activeOrders.reduce(
      (total, order) =>
        total +
        order.items.reduce((itemTotal, item) => itemTotal + (item.unidad === "TN" ? item.cantidad : 0), 0),
      0,
    );

    return {
      today: activeOrders.filter((order) => order.fechaEntrega === today).length,
      week: activeOrders.filter((order) => order.fechaEntrega >= today && order.fechaEntrega <= weekTo).length,
      pending: pendingOrders.length,
      liters,
      tons,
    };
  }, [orders]);

  const updateField = (field: keyof OrderFormState, value: string | OrderStatus) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (id: string, field: keyof OrderItem, value: string | number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  };

  const removeItem = (id: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const saveOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const items = form.items
      .map((item) => ({
        ...item,
        articulo: item.articulo.trim(),
        cantidad: Number(item.cantidad),
        observaciones: item.observaciones.trim(),
      }))
      .filter((item) => item.articulo && item.cantidad > 0);

    if (!form.cliente.trim() || !form.fechaEntrega || !items.length) {
      setMessage("Carga cliente, fecha de entrega y al menos un articulo con cantidad.");
      return;
    }

    const timestamp = new Date().toISOString();

    if (editingId) {
      setOrders((current) =>
        current.map((order) =>
          order.id === editingId
            ? {
                ...order,
                ...form,
                cliente: form.cliente.trim(),
                transporte: form.transporte.trim(),
                chofer: form.chofer.trim(),
                telefono: form.telefono.trim(),
                documento: form.documento.trim(),
                licencia: form.licencia.trim(),
                patente: form.patente.trim().toUpperCase(),
                observaciones: form.observaciones.trim(),
                items,
                updatedAt: timestamp,
              }
            : order,
        ),
      );
      setMessage("Pedido actualizado.");
      resetForm();
      return;
    }

    const order: Order = {
      ...form,
      id: crypto.randomUUID(),
      numero: nextOrderNumber(orders),
      cliente: form.cliente.trim(),
      transporte: form.transporte.trim(),
      chofer: form.chofer.trim(),
      telefono: form.telefono.trim(),
      documento: form.documento.trim(),
      licencia: form.licencia.trim(),
      patente: form.patente.trim().toUpperCase(),
      observaciones: form.observaciones.trim(),
      remitoBorradorId: null,
      items,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setOrders((current) => [order, ...current]);
    setMessage("Pedido cargado.");
    resetForm();
  };

  const editOrder = (order: Order) => {
    setEditingId(order.id);
    setForm({
      cliente: order.cliente,
      fechaPedido: order.fechaPedido,
      fechaEntrega: order.fechaEntrega,
      transporte: order.transporte,
      chofer: order.chofer,
      telefono: order.telefono,
      documento: order.documento,
      licencia: order.licencia,
      patente: order.patente,
      observaciones: order.observaciones,
      estado: order.estado,
      items: order.items.length ? order.items : [emptyItem()],
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeStatus = (id: string, estado: OrderStatus) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, estado, updatedAt: new Date().toISOString() } : order,
      ),
    );
  };

  return (
    <div className="page-shell orders-page">
      <section className="orders-header">
        <div>
          <p className="eyebrow">Ventas / Pedidos</p>
          <h1>Pedidos operativos</h1>
          <p>
            Carga pedidos diarios o semanales con articulos, entrega y datos de transporte. La estructura queda lista
            para generar remitos autocompletados desde un pedido.
          </p>
        </div>
        <div className="orders-kpis">
          <div>
            <span>Hoy</span>
            <strong>{dashboard.today}</strong>
          </div>
          <div>
            <span>Prox. 7 dias</span>
            <strong>{dashboard.week}</strong>
          </div>
          <div>
            <span>Pendientes</span>
            <strong>{dashboard.pending}</strong>
          </div>
          <div>
            <span>Litros</span>
            <strong>{number(dashboard.liters)}</strong>
          </div>
          <div>
            <span>TN</span>
            <strong>{number(dashboard.tons)}</strong>
          </div>
        </div>
      </section>

      <section className="orders-layout">
        <form className="form-card orders-form" onSubmit={saveOrder}>
          <div className="section-head">
            <div>
              <p className="eyebrow">{editingId ? "Edicion" : "Nuevo pedido"}</p>
              <h2>{editingId ? "Modificar pedido" : "Cargar pedido"}</h2>
            </div>
            <button className="button-secondary" type="button" onClick={resetForm}>
              Limpiar
            </button>
          </div>

          <div className="form-grid">
            <label className="field">
              Cliente
              <input value={form.cliente} onChange={(event) => updateField("cliente", event.target.value)} />
            </label>
            <label className="field">
              Estado
              <select
                value={form.estado}
                onChange={(event) => updateField("estado", event.target.value as OrderStatus)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Fecha pedido
              <input
                type="date"
                value={form.fechaPedido}
                onChange={(event) => updateField("fechaPedido", event.target.value)}
              />
            </label>
            <label className="field">
              Fecha entrega
              <input
                type="date"
                value={form.fechaEntrega}
                onChange={(event) => updateField("fechaEntrega", event.target.value)}
              />
            </label>
            <label className="field">
              Transporte
              <input value={form.transporte} onChange={(event) => updateField("transporte", event.target.value)} />
            </label>
            <label className="field">
              Chofer
              <input value={form.chofer} onChange={(event) => updateField("chofer", event.target.value)} />
            </label>
            <label className="field">
              Telefono
              <input value={form.telefono} onChange={(event) => updateField("telefono", event.target.value)} />
            </label>
            <label className="field">
              Documento
              <input value={form.documento} onChange={(event) => updateField("documento", event.target.value)} />
            </label>
            <label className="field">
              Licencia
              <input value={form.licencia} onChange={(event) => updateField("licencia", event.target.value)} />
            </label>
            <label className="field">
              Patente
              <input value={form.patente} onChange={(event) => updateField("patente", event.target.value)} />
            </label>
            <label className="field-full">
              Observaciones
              <textarea
                value={form.observaciones}
                onChange={(event) => updateField("observaciones", event.target.value)}
              />
            </label>
          </div>

          <div className="order-items-head">
            <div>
              <h3>Articulos del pedido</h3>
              <p>Un pedido puede tener varios articulos y unidades.</p>
            </div>
            <button className="button-secondary" type="button" onClick={addItem}>
              Agregar articulo
            </button>
          </div>

          <div className="order-item-list">
            {form.items.map((item) => (
              <div className="order-item-row" key={item.id}>
                <label className="field">
                  Articulo
                  <input value={item.articulo} onChange={(event) => updateItem(item.id, "articulo", event.target.value)} />
                </label>
                <label className="field">
                  Cantidad
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={item.cantidad || ""}
                    onChange={(event) => updateItem(item.id, "cantidad", Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  Unidad
                  <select value={item.unidad} onChange={(event) => updateItem(item.id, "unidad", event.target.value)}>
                    {unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Obs. articulo
                  <input
                    value={item.observaciones}
                    onChange={(event) => updateItem(item.id, "observaciones", event.target.value)}
                  />
                </label>
                <button className="button-secondary compact-table-action" type="button" onClick={() => removeItem(item.id)}>
                  Quitar
                </button>
              </div>
            ))}
          </div>

          {message ? <div className={`message ${message.includes("Carga") ? "error" : "success"}`}>{message}</div> : null}

          <div className="actions">
            <button className="button" type="submit">
              {editingId ? "Guardar cambios" : "Guardar pedido"}
            </button>
            <button className="button-secondary" type="button" disabled>
              Generar remito
            </button>
          </div>
        </form>

        <aside className="panel orders-side-panel">
          <h2>Flujo operativo</h2>
          <div className="trace-list">
            <div className="trace-item">
              <strong>Pedido</strong>
              Cliente, articulos, entrega y transporte.
            </div>
            <div className="trace-item">
              <strong>Preparacion</strong>
              Estado operativo para planificar despacho.
            </div>
            <div className="trace-item">
              <strong>Remito futuro</strong>
              El pedido guarda los datos necesarios para autocompletar un remito.
            </div>
          </div>
        </aside>
      </section>

      <section className="table-card orders-list-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Pedidos cargados</h2>
            <p>Filtra por cliente, articulo, transporte, patente, estado o rango de entrega.</p>
          </div>
          <strong>{filteredOrders.length} pedidos</strong>
        </div>

        <div className="orders-filters">
          <label className="field">
            Buscador
            <input
              placeholder="Cliente, articulo, pedido, transporte..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            Estado
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "TODOS")}>
              <option value="TODOS">Todos</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Entrega desde
            <input type="date" value={deliveryFrom} onChange={(event) => setDeliveryFrom(event.target.value)} />
          </label>
          <label className="field">
            Entrega hasta
            <input type="date" value={deliveryTo} onChange={(event) => setDeliveryTo(event.target.value)} />
          </label>
        </div>

        <div className="order-card-list">
          {filteredOrders.length ? (
            filteredOrders.map((order) => (
              <details className="order-card" key={order.id}>
                <summary>
                  <div>
                    <span className={`status-pill order-status-${order.estado.toLowerCase()}`}>
                      {statusLabel(order.estado)}
                    </span>
                    <h3>
                      {order.numero} - {order.cliente}
                    </h3>
                    <p>
                      Entrega {formatDate(order.fechaEntrega)} · {order.items.length} articulos · {orderUnitsSummary(order)}
                    </p>
                  </div>
                  <strong>{order.patente || "Sin patente"}</strong>
                </summary>
                <div className="order-card-body">
                  <div className="order-meta-grid">
                    <div>
                      <span>Transporte</span>
                      <strong>{order.transporte || "-"}</strong>
                    </div>
                    <div>
                      <span>Chofer</span>
                      <strong>{order.chofer || "-"}</strong>
                    </div>
                    <div>
                      <span>Telefono</span>
                      <strong>{order.telefono || "-"}</strong>
                    </div>
                    <div>
                      <span>Documento</span>
                      <strong>{order.documento || "-"}</strong>
                    </div>
                    <div>
                      <span>Licencia</span>
                      <strong>{order.licencia || "-"}</strong>
                    </div>
                    <div>
                      <span>Remito futuro</span>
                      <strong>{order.remitoBorradorId ?? "Pendiente"}</strong>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Articulo</th>
                          <th>Cantidad</th>
                          <th>Unidad</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.articulo}</strong></td>
                            <td>{number(item.cantidad)}</td>
                            <td>{item.unidad}</td>
                            <td>{item.observaciones || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {order.observaciones ? <p className="hint">{order.observaciones}</p> : null}
                  <div className="order-card-actions">
                    <button className="button-secondary" type="button" onClick={() => editOrder(order)}>
                      Editar
                    </button>
                    <select value={order.estado} onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)}>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button className="button-secondary" type="button" disabled>
                      Generar remito
                    </button>
                  </div>
                </div>
              </details>
            ))
          ) : (
            <div className="empty-state">No hay pedidos cargados o no coinciden con el filtro.</div>
          )}
        </div>
      </section>
    </div>
  );
}
