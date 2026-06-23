import { ModulePage } from "../../components/module-page";

export default function TesoreriaPage() {
  return (
    <ModulePage
      title="Tesoreria"
      description="Cajas, bancos, valores, cheques, conciliacion, movimientos entre cajas y reportes financieros operativos."
      highlights={[
        "Cuentas de caja y banco",
        "Ingresos, egresos y transferencias",
        "Cheques y valores",
        "Conciliacion",
        "Cierres y reportes",
      ]}
    />
  );
}
