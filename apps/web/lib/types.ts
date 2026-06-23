export type Warehouse = {
  id: string;
  code: string;
  name: string;
  type: string | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
};

export type Customer = {
  id: string;
  code: string;
  businessName: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

export type StockBalance = {
  id: string;
  quantityOnHand: number | string;
  quantityReserved?: number | string;
  warehouse: Warehouse;
  product: Product;
};

export type StockMovement = {
  id: string;
  movementType: string;
  direction: string;
  quantity: number | string;
  movementDate: string;
  referenceDocument: string;
  warehouse: Warehouse;
  product: Product;
};

export type DeliveryAllocation = {
  id: string;
  quantity: number | string;
  warehouse: Warehouse;
  stockMovement?: {
    id: string;
  } | null;
};

export type DeliveryItem = {
  id: string;
  quantity: number | string;
  product: Product;
  allocations: DeliveryAllocation[];
};

export type DeliveryNoteTraceability = {
  id: string;
  number: string;
  status: string;
  customer: Customer;
  items: DeliveryItem[];
};

export type DashboardData = {
  stockBalances: StockBalance[];
  stockMovements: StockMovement[];
  deliveryNotes: DeliveryNoteTraceability[];
  customers: Customer[];
  products: Product[];
  warehouses: Warehouse[];
  users: User[];
};
