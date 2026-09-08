export type OrderStatus = "BORRADOR" | "CONFIRMADO" | "PREPARACION" | "DESPACHADO" | "CANCELADO" | "PARCIAL";
export type OrderUnit = "L" | "KG" | "TN" | "UN" | "IBC" | "BIDON";

export type OrderItem = {
  id: string;
  articulo: string;
  cantidad: number;
  unidad: OrderUnit;
  observaciones: string;
};

export type Order = {
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
  version: number;
  deliveryNotes: DeliveryNote[];
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type OrderFormState = Omit<Order, "id" | "numero" | "createdAt" | "updatedAt" | "remitoBorradorId" | "version" | "deliveryNotes">;

export type DeliveryNote = { id: string; numero: string; payload: OrderFormState & { fechaRemito: string }; created_at: string };
