import { ModulePage } from "../../components/module-page";

export default function ProduccionPage() {
  return (
    <ModulePage
      title="Produccion"
      description="Listas de materiales, ordenes de produccion, consumo de insumos, altas de terminados y analisis de rendimiento."
      highlights={[
        "Listas de materiales",
        "Ordenes de produccion",
        "Consumo teorico y real",
        "Actualizacion de costos",
        "Analisis de rendimiento",
      ]}
    />
  );
}
