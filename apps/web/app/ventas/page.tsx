import { ModulePage } from "../../components/module-page";

export default function VentasPage() {
  return (
    <ModulePage
      title="Ventas"
      description="Clientes, vendedores, presupuestos, pedidos, remitos, facturacion, notas de credito y cuenta corriente."
      highlights={[
        "Clientes y tipos de cliente",
        "Pedidos y ordenes de venta",
        "Facturacion y remitos",
        "Cuenta corriente y cobranzas",
        "Reportes comerciales",
      ]}
    />
  );
}
