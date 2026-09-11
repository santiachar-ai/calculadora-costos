# Personal y Configuración del sistema — Supabase

## Proyecto correcto

- Repositorio: `santiachar-ai/calculadora-costos`.
- ERP publicado: `https://calculadora-costos-tau.vercel.app`.
- Supabase: `erp-propio`, referencia `yklyjamiyjvydotvqjeg`, según la documentación existente.
- Cuenta administradora existente: `santi.achar@gmail.com`.

Se conserva Supabase Auth y su pantalla de acceso. No se crean contraseñas,
sesiones alternativas ni usuarios `admin@erp.local`. Los cambios hechos antes
en la carpeta superior `Playground` pertenecen a otra versión y no se incluyen.

## Funciones agregadas

Personal (`/personal`): alta, consulta, edición e inactivación de legajos;
búsqueda por nombre, DNI, legajo, sector o puesto. La pantalla existente de
horas y asistencia sigue en `/personal/horas`. DNI y legajo son únicos y hay
control de versión para evitar sobrescribir una edición ajena.

Configuración (`/administracion`): habilitar cuentas ya creadas en Supabase Auth,
asignar o revocar acceso al ERP, definir administradores y permisos Ver/Operar
por módulo. No cambia contraseñas. Las invitaciones y recuperación de contraseña
siguen perteneciendo al proyecto Supabase existente.

Un administrador ve todos los módulos. Los usuarios consultan u operan solo los
asignados. Operar agrupa las acciones disponibles; aún no separa cada botón,
campo o empleado. Los módulos que son prototipos conservan su alcance actual.
Los remitos de Pedidos siguen siendo internos y sin conexión a stock, como antes.

## Seguridad y continuidad

- RLS protege los legajos y las lecturas de pedidos/remitos/eventos.
- Las escrituras pasan por RPC con verificación de permisos en PostgreSQL.
- Se rechazan escrituras directas, autoasignación de permisos y cambios de acceso
  por usuarios sin administración.
- Se protege al último administrador habilitado mediante bloqueo transaccional.
- Las revocaciones se aplican a la siguiente consulta/operación en Supabase,
  aunque el usuario conserve un token válido. El menú se actualiza al navegar,
  volver a la ventana o cada 30 segundos. No se cambia la contraseña ni se revoca
  el acceso a otras aplicaciones que usen la misma cuenta Supabase.
- Las cuentas previamente habilitadas conservan el acceso que ya tenían.
  Revisar sus permisos en el panel después de activar la migración.
- Los accesos, legajos y pedidos viven en la misma base y se comparten entre PC.
  La calculadora y los prototipos mantienen su almacenamiento anterior.

## Activación de la instalación publicada

La migración ya está aplicada en `erp-propio`. La verificación del 11/09/2026
confirmó la cuenta `santi.achar@gmail.com` habilitada y administradora, las cinco
políticas de las tablas afectadas y las cinco funciones públicas de acceso.
El código se incorporó a `main` para su despliegue automático en Vercel.
**No volver a ejecutar la migración en esta base.**

Secuencia de instalación para otras bases:

1. Revisar y aplicar en el SQL Editor del proyecto correcto
   `supabase/migrations/202609100001_personnel_access.sql` **una sola vez**.
   La migración es transaccional; se detiene si no encuentra la cuenta existente
   habilitada `santi.achar@gmail.com`. No modifica `auth.users` ni contraseñas.
   Esa cuenta recibe administración del ERP.
2. Después de aplicar SQL, desplegar esta revisión de `apps/web` en Vercel,
   conservando las variables actuales de Supabase. No desplegar el frontend
   nuevo antes de la migración: requiere las columnas y RPC nuevas.
3. Iniciar sesión con la cuenta y contraseña actuales. Verificar Personal,
   Configuración, Pedidos y la consulta desde una segunda PC.

La aplicación se hizo con autorización explícita del usuario, quien confirmó
la advertencia del SQL Editor. No se cambiaron contraseñas ni datos de pedidos.

## Validación local

Desde la raíz:

```sh
node apps/web/tests/personnel-access.test.mjs
node apps/web/tests/supabase-orders.test.mjs
npm run build --workspace web
```

Las pruebas usan PostgreSQL embebido (PGlite) con roles autenticados/anónimos,
RLS y las dos migraciones reales. Incluyen conservación de cuenta, legajos,
validaciones, conflictos, concesión y revocación de permisos, último administrador
y regresión de entregas completas/parciales y cancelaciones.

Con la web en puerto 3100, `node apps/web/tests/auth-routes.test.mjs` comprueba
que las rutas rechacen sesiones ausentes o inválidas. La prueba con la cuenta
real requiere iniciar sesión con las credenciales existentes del usuario.
