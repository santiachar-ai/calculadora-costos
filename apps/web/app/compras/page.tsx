import { ModulePage } from "../../components/module-page";

export default function ComprasPage() {
  return (
    <ModulePage
      title="Compras"
      description="Proveedores, ordenes de compra, recepciones, comprobantes de proveedor, pagos y cuenta corriente."
      highlights={[
        "Proveedores y compradores",
        "Documentos de orden",
        "Recepcion e ingreso a stock",
        "Cuenta corriente de proveedor",
        "Reportes de compras",
      ]}
    />
  );
}
