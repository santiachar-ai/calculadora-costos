import { ModulePage } from "../../components/module-page";

export default function AdministracionPage() {
  return (
    <ModulePage
      title="Administracion"
      description="Usuarios, roles, permisos, configuraciones generales y herramientas administrativas."
      highlights={[
        "Usuarios",
        "Roles y permisos",
        "Configuracion general",
        "Auditoria",
        "Herramientas del sistema",
      ]}
    />
  );
}
