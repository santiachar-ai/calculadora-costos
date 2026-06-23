import { ModulePage } from "../../components/module-page";

export default function MaestrosPage() {
  return (
    <ModulePage
      title="Maestros"
      description="Definiciones base del sistema: clientes, proveedores, productos, depositos, listas y clasificaciones."
      highlights={[
        "Clientes",
        "Proveedores",
        "Productos",
        "Depositos",
        "Listas y clasificaciones",
      ]}
    />
  );
}
