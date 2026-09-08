# Supabase para pedidos y remitos

## Estado

La integración usa el repositorio `calculadora-costos`, que corresponde a la app publicada en Vercel. La organización de Supabase es `ERP Propio` (Free). El proyecto `erp-propio` (ref. `yklyjamiyjvydotvqjeg`) está creado. La migración se aplicó desde el SQL Editor con autorización del usuario. El primer usuario del ERP fue habilitado y verificado con autorización del usuario. Las variables públicas de Supabase están configuradas en el entorno Production de Vercel. Pendiente: publicar el código y verificar el acceso en producción.

## Configuración

1. Crear el proyecto gratuito `erp-propio` en Supabase. Activar Data API y RLS automático; desactivar la exposición automática de tablas.
2. Aplicar `supabase/migrations/202609070001_orders.sql` en el SQL Editor del proyecto nuevo. No aplicar sobre tablas existentes con esos nombres sin revisar una migración incremental.
3. Crear las cuentas de los usuarios del ERP en Authentication. La cuenta que administra Supabase no es automáticamente un usuario de la aplicación.
4. Habilitar cada usuario autorizado desde el SQL Editor, reemplazando el UUID por el id de Authentication:

```sql
insert into public.erp_members(user_id) values ('UUID-DEL-USUARIO');
```

5. Agregar en Vercel, para el proyecto y entorno correctos, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, obtenidos de Supabase. Nunca usar la clave secreta/service_role en variables públicas. Mantener `NEXT_PUBLIC_COSTS_CONFIG_MODE=local` para la calculadora.
6. Desplegar `apps/web` y comprobar `/pedidos` con una cuenta habilitada.

## Comportamiento

- Los pedidos se guardan en Postgres y se comparten entre cuentas habilitadas de esta única empresa.
- La sesión del ERP se inicia con correo y contraseña. No hay registro público en la pantalla.
- RLS y los permisos SQL impiden lectura anónima y escritura directa; todas las modificaciones pasan por funciones que verifican membresía.
- El pedido nace en borrador. Confirmado/En preparación permiten preparar un remito.
- La emisión exige confirmación explícita, bloquea el pedido durante la transacción, valida saldos y conserva datos de cliente, transporte, chofer y artículos como estaban al emitir.
- Las entregas parciales dejan saldo pendiente; el estado Despachado se calcula al completar la entrega.
- Cancelar conserva lo entregado. Los pedidos cerrados y remitos emitidos no admiten edición.
- Las versiones evitan que un reintento o una pantalla desactualizada sobrescriban cambios o dupliquen una entrega.
- La numeración interna es correlativa; PostgreSQL puede dejar saltos al abortar una transacción. No es numeración fiscal.
- Actualizar pedidos recarga los datos compartidos. No se implementó sincronización automática en tiempo real.

## Datos anteriores y alcance

No se borra ni se importa automáticamente `erp-orders-v1` del navegador. Si hubiera pedidos anteriores, deben revisarse e importarse explícitamente. El resto de los módulos conserva su almacenamiento actual.

Los artículos y clientes de esta primera pantalla son texto libre. Los remitos son documentos internos consultables, sin PDF/impresión ni reversión de remitos emitidos todavía. No se conectó stock: antes se necesita vincular artículos con los maestros y depósitos del ERP. La API SQLite anterior permanece separada; no se envían los pedidos nuevos a localhost.

## Validación

```sh
node apps/web/tests/supabase-orders.test.mjs
npm run build --workspace web
```

Las pruebas ejecutan la migración real sobre PostgreSQL embebido (PGlite), con roles y auth.uid simulados. Cubren entregas completas/parciales, confirmación, reintentos, edición, cancelación, membresías, RLS y rechazo de modificaciones directas. La conexión real y Supabase Auth requieren una prueba adicional después de crear/configurar el proyecto.
