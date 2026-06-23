import { ModulePage } from "../../components/module-page";

export default function ContabilidadPage() {
  return (
    <ModulePage
      title="Contabilidad"
      description="Periodos, asientos, cuentas contables, centros de costo, cierres e informes."
      highlights={[
        "Periodos y asientos",
        "Cuentas contables",
        "Centros de costo",
        "Cierres de ejercicio",
        "Informes contables",
      ]}
    />
  );
}
