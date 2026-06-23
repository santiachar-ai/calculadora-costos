# Descubrimiento ERP

## 1. Problema de negocio

Queremos construir un ERP que resuelva las áreas donde el sistema actual de la empresa falla, es lento, no acompaña la operación o obliga a hacer trabajo manual por fuera.

La idea no es clonar todo el ERP existente desde el día 1, sino reemplazar primero los puntos que más dolor generan.

## 2. Brechas del ERP actual

Completar con ejemplos concretos.

### Procesos deficientes

| Proceso | Qué debería pasar | Qué pasa hoy | Impacto | Prioridad |
|---|---|---|---|---|
| Ventas | Cotizar y facturar rápido | Se demora y hay doble carga | Pérdida de tiempo y errores | Alta |
| Stock | Reflejar salidas reales por depósito en cada remito | El remito solo permite descontar desde un depósito, aunque la mercadería salga de varios | Trazabilidad incorrecta y ajustes manuales posteriores | Alta |
| Compras | Reposición automática o sugerida | Se hace manual por Excel | Faltantes y sobrestock | Media |
| Cobranzas | Seguimiento de deuda y vencimientos | No hay alertas claras | Mora y pérdida financiera | Alta |
| Reportes | Tableros confiables | Datos dispersos o inconsistentes | Decisiones lentas | Alta |

### Caso real prioritario: remitos con múltiples depósitos

#### Situación actual

Hoy, al generar un remito, el ERP obliga a imputar todo el movimiento de stock a un único depósito de origen.

#### Problema

En la operación real, un mismo remito muchas veces se arma con mercadería que sale de más de un depósito. Como el sistema no lo soporta:

- el remito nace con una salida de stock incompleta o incorrecta
- después hay que corregir manualmente con un movimiento interno
- la trazabilidad del movimiento original queda distorsionada
- los reportes por depósito dejan de reflejar exactamente qué ocurrió

#### Impacto operativo

- más trabajo manual
- mayor riesgo de error humano
- dificultad para auditar salidas reales
- diferencia entre documento comercial y movimiento físico
- menor confiabilidad del stock por depósito

#### Necesidad funcional

El sistema nuevo debe permitir que un mismo remito tenga múltiples líneas de salida de stock, cada una asociada al depósito real desde el que sale la mercadería.

#### Ejemplo esperado

Remito `R-000123`

- Producto A, 10 unidades
  - 6 unidades desde Depósito Central
  - 4 unidades desde Depósito Picking
- Producto B, 5 unidades
  - 5 unidades desde Depósito Picking

#### Regla de negocio propuesta

1. El remito representa el documento comercial y logístico.
2. Cada ítem del remito puede dividirse en una o más imputaciones de stock.
3. La suma de las imputaciones por depósito debe coincidir con la cantidad remitida del ítem.
4. El movimiento de stock debe generarse automáticamente desde los depósitos correctos al confirmar el remito.
5. No debería ser necesario crear un movimiento interno posterior para corregir el origen real.
6. La auditoría debe permitir reconstruir qué depósito abasteció cada parte del remito.

### Caso operativo adicional: tanques como depósitos físicos

En esta operación, los depósitos de producto terminado no son genéricos. Cada tanque funciona como un depósito físico identificado y asociado normalmente a un producto específico.

#### Asignación actual de tanques

- Tanque 1, 2 y 5: `Solución Urea Industrial`
- Tanque 3, 4, 6 y 8: `Solución urea 32,5` o `OPTI-BLUE Solución de urea al 32,5`
- Tanque 7: `Urkem urea automotor líquida`

#### Regla comercial importante

`Solución urea 32,5` y `OPTI-BLUE Solución de urea al 32,5` representan el mismo producto base desde el punto de vista del stock, pero pueden salir con distinto nombre comercial según el tipo de remito o cliente.

Ejemplo:

- remito IF: mostrar `Solución urea 32,5`
- remito Hallpa: mostrar `OPTI-BLUE Solución de urea al 32,5`

#### Implicancia funcional

El ERP debería separar:

- producto base para stock y producción
- descripción comercial o marca mostrada en el documento

Eso evita duplicar stock para un mismo producto físico solo por cambiar el nombre impreso en el remito.

#### Formatos de salida

Los productos se comercializan:

- a granel
- en IBC de 1000 litros
- en bidones de 10 y 20 litros

#### Alcance por etapas

##### Etapa actual

Resolver remitos multi-depósito tomando como origen los tanques reales.

##### Etapa posterior

Para bidones de 10 y 20 litros, el módulo de producción debería consumir producto terminado desde el tanque correspondiente y dar de alta el producto envasado como nuevo stock en otro depósito de terminados.

### Preguntas clave

- ¿Qué hace hoy la gente en Excel, WhatsApp o papel porque el ERP no lo resuelve?
- ¿Qué tareas requieren doble carga?
- ¿Dónde aparecen más errores humanos?
- ¿Qué reportes son críticos y hoy no existen o llegan tarde?
- ¿Qué integraciones faltan?
- ¿Qué parte del sistema actual frena ventas, cobranzas o producción?

## 3. Módulos candidatos

No todos tienen que hacerse al inicio.

### Núcleo maestro

- usuarios, roles y permisos
- clientes
- proveedores
- productos y variantes
- listas de precios
- depósitos o sucursales
- tanques o depósitos físicos por producto

### Comercial

- oportunidades o CRM básico
- presupuestos
- pedidos de venta
- remitos
- facturación
- notas de crédito

#### Alcance recomendado para ventas

- gestión de clientes
- listas de precios
- pedidos
- remitos
- reserva y descuento de stock
- facturación
- cuenta corriente del cliente

#### Aclaración sobre ARCA

El módulo de ventas sí puede implementarse desde ahora. Lo que conviene separar es:

- la gestión comercial interna del ERP
- la integración fiscal con ARCA para autorizar comprobantes electrónicos

De ese modo, el flujo de ventas puede construirse ya, y la emisión fiscal electrónica puede integrarse como una capa adicional.

### Stock y logística

- movimientos de inventario
- transferencias entre depósitos
- ajustes de stock
- lotes o series
- picking y despacho

### Compras

- solicitudes internas
- órdenes de compra
- recepción
- control contra factura

#### Alcance recomendado para compras

- solicitudes de compra
- órdenes de compra
- recepción parcial o total
- ingreso de stock
- registro de factura del proveedor
- cuenta corriente del proveedor

#### Aclaración sobre ARCA

En principio, registrar compras dentro del ERP no requiere una certificación equivalente a la emisión de comprobantes propios. La parte sensible con ARCA está principalmente del lado de la facturación electrónica emitida por la empresa.

### Finanzas

- cuentas corrientes
- cobranzas
- pagos
- caja y bancos
- conciliación
- vencimientos

### Producción

- recetas o fórmulas
- listas de materiales
- órdenes de producción
- consumo de insumos
- costos

#### Alcance recomendado para producción

- definición de fórmulas o recetas
- versión de fórmula por producto
- orden de producción
- consumo teórico y real de materia prima
- alta de producto terminado
- registro de mermas
- trazabilidad entre lote producido e insumos consumidos

### Analítica

- tableros operativos
- KPIs por área
- exportaciones
- auditoría de cambios

### Registro transversal de movimientos

Este no debería ser un módulo aislado, sino una capacidad común a todo el ERP.

Debe registrar:

- movimiento de stock
- cambio de estado de documentos
- altas y bajas lógicas
- confirmaciones y anulaciones
- usuario, fecha y hora
- documento origen
- módulo origen
- observaciones o motivo

## 4. MVP recomendado

Para no trabarnos, conviene arrancar con un MVP de alto impacto. Una opción razonable:

### MVP 1

- clientes, productos y usuarios
- depósitos
- pedidos de venta
- remitos con múltiples depósitos por ítem
- stock básico por depósito
- facturación interna
- cuentas corrientes
- reportes operativos mínimos
- registro de movimientos y auditoría

### Resultado esperado del MVP

- menos doble carga
- stock más confiable
- mejor visibilidad de deuda y ventas
- trazabilidad básica de cada operación

### MVP 2

- compras
- recepción con impacto en stock
- producción con fórmulas
- consumo de materia prima
- alta de producto terminado
- dashboards por módulo

### MVP 3

- integración fiscal con ARCA
- validaciones tributarias específicas
- automatizaciones e integraciones externas

## 5. Requisitos no funcionales

Además de funciones, el ERP debería cumplir:

- rapidez en operaciones diarias
- permisos por rol
- trazabilidad de cambios
- exportación a Excel y PDF
- historial de movimientos
- respaldo y recuperación
- multiusuario
- soporte para múltiples sucursales si aplica
- API para integraciones futuras

## 6. Arquitectura inicial sugerida

Propuesta pragmática para una primera versión moderna.

### Frontend

- aplicación web
- panel administrativo responsive
- flujos rápidos para operación diaria

### Backend

- API central con reglas de negocio
- autenticación, permisos y auditoría
- servicios por dominio: ventas, stock, compras, finanzas

### Base de datos

- PostgreSQL
- modelo transaccional normalizado
- historial de eventos críticos

### Integraciones futuras

- facturación electrónica
- e-commerce
- Mercado Libre
- bancos o medios de pago
- BI

## 7. Modelo de datos inicial

Entidades mínimas para arrancar:

- users
- roles
- customers
- suppliers
- products
- warehouses
- stock_movements
- sales_orders
- delivery_notes
- delivery_note_allocations
- invoices
- account_entries
- payments

### Entidades clave para resolver la trazabilidad

#### delivery_notes

Cabecera del remito.

#### delivery_note_items

Detalle de productos y cantidades remitidas.

#### delivery_note_allocations

Desglose de cada ítem del remito por depósito de origen.

Campos sugeridos:

- id
- delivery_note_item_id
- warehouse_id
- quantity
- stock_movement_id

#### stock_movements

Movimiento real de inventario generado a partir de cada imputación.

## 8. Roadmap sugerido

### Etapa 1: Descubrimiento

- relevar procesos reales
- documentar dolores
- priorizar módulos
- definir MVP

### Etapa 2: Base técnica

- autenticación
- permisos
- diseño de base de datos
- layout general
- auditoría

### Etapa 3: Operación comercial

- clientes
- productos
- ventas
- remitos multi-depósito
- facturación interna

### Etapa 4: Stock, compras y producción

- inventario
- movimientos
- compras
- recepción
- fórmulas
- órdenes de producción
- consumo y altas de terminados

### Etapa 5: Finanzas y reportes

- cobranzas
- pagos
- cuenta corriente
- tablero gerencial
- dashboards por módulo

### Etapa 6: Integración fiscal y externa

- ARCA facturación electrónica
- e-commerce
- medios de pago
- otros sistemas

## 9. Riesgos a evitar

- intentar replicar todo el ERP viejo de una vez
- mezclar reglas de negocio sin documentarlas
- no definir responsables por proceso
- diseñar pantallas antes de entender la operación
- no registrar auditoría
- no contemplar migración de datos

## 10. Decisiones por tomar

Estas definiciones destraban la implementación:

- qué proceso duele más hoy
- qué usuarios van a usar primero el sistema
- qué datos hay que migrar
- si se necesita facturación electrónica con ARCA desde el inicio
- si habrá múltiples depósitos o sucursales
- si el sistema debe convivir un tiempo con el ERP actual
- si producción requiere lotes, vencimientos o trazabilidad por partida

## 11. Recomendación de arranque

Si hoy todavía no está claro por dónde empezar, conviene hacer esto:

1. Listar 5 fallas concretas del ERP actual.
2. Medir impacto en tiempo, errores o dinero.
3. Elegir un solo flujo para resolver primero.
4. Diseñar ese flujo extremo a extremo.
5. Recién ahí empezar a programar.

## 12. Primer backlog sugerido

- alta de clientes
- alta de productos
- login y permisos
- alta de depósitos
- crear pedido de venta
- generar remito con múltiples depósitos por ítem
- descontar stock
- emitir factura interna
- registrar cobro
- ver deuda por cliente
- crear orden de compra
- recepcionar mercadería
- definir fórmula de producción
- emitir orden de producción
- consumir materia prima
- dar alta de producto terminado
- reporte diario de ventas
- historial de movimientos por producto
- dashboard operativo por módulo
