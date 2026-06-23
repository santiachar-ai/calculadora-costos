# Diseno Tecnico Inicial del MVP

## 1. Objetivo

Definir una base tecnica para construir el ERP por etapas, priorizando:

- trazabilidad de stock por deposito
- remitos con multiples depositos por item
- ventas
- compras
- produccion con formulas
- dashboards
- registro transversal de movimientos

## 2. Principios de diseno

- un solo origen de verdad para stock, documentos y movimientos
- cada accion importante debe dejar trazabilidad
- los documentos comerciales no deben requerir correcciones manuales posteriores
- la logica de negocio debe vivir en backend
- la integracion con ARCA debe estar desacoplada del nucleo operativo
- el producto fisico y el nombre comercial del documento pueden no ser exactamente lo mismo

## 3. Modulos del MVP

### Modulo 1: Maestros

- usuarios
- roles y permisos
- clientes
- proveedores
- productos
- depositos
- unidades de medida

### Modulo 2: Ventas y stock

- pedidos de venta
- remitos
- asignacion de stock por deposito
- movimientos de stock
- facturacion interna
- cuenta corriente de clientes

### Modulo 3: Compras

- ordenes de compra
- recepciones
- ingresos de stock
- factura de proveedor
- cuenta corriente de proveedores

### Modulo 4: Produccion

- formulas
- versiones de formula
- ordenes de produccion
- consumo de materia prima
- alta de producto terminado
- registro de merma

### Modulo 5: Auditoria e informes

- historial de eventos
- reportes operativos
- dashboards por modulo

## 4. Arquitectura sugerida

### Frontend

- aplicacion web administrativa
- vistas separadas por modulo
- formularios operativos simples y rapidos
- dashboards con filtros por fecha, deposito, producto, cliente y proveedor

### Backend

- API REST
- servicio de autenticacion
- servicio de autorizacion por rol
- servicios por dominio:
  - sales
  - inventory
  - purchases
  - production
  - reporting
  - audit

### Base de datos

- PostgreSQL
- transacciones para operaciones que impactan stock o saldos
- claves foraneas para asegurar integridad
- soft delete solo donde tenga sentido funcional

## 5. Entidades principales

### Seguridad

#### users

- id
- name
- email
- password_hash
- is_active
- created_at

#### roles

- id
- name
- description

#### user_roles

- user_id
- role_id

### Maestros

#### customers

- id
- code
- business_name
- tax_id
- email
- phone
- is_active

#### suppliers

- id
- code
- business_name
- tax_id
- email
- phone
- is_active

#### warehouses

- id
- code
- name
- type
- physical_type
- capacity
- is_active

Uso recomendado:

- depositos normales
- tanques de producto terminado
- deposito de envasado
- deposito de terminados en bidon

#### products

- id
- sku
- name
- product_type
- unit_of_measure_id
- tracks_stock
- commercial_family
- is_active

#### product_aliases

Permite que un mismo producto base salga con distinto nombre comercial segun cliente, marca o tipo de remito.

- id
- product_id
- alias_name
- channel
- customer_id opcional
- is_active

#### unit_of_measure

- id
- code
- name

### Ventas

#### sales_orders

- id
- number
- customer_id
- status
- order_date
- notes
- created_by

#### sales_order_items

- id
- sales_order_id
- product_id
- quantity
- unit_price

#### delivery_notes

- id
- number
- customer_id
- sales_order_id
- status
- delivery_date
- confirmed_at
- confirmed_by

#### delivery_note_items

- id
- delivery_note_id
- product_id
- display_name
- quantity

`display_name` guarda el nombre comercial que se imprimio en el documento, aunque el stock se descuente del `product_id` base.

#### delivery_note_allocations

- id
- delivery_note_item_id
- warehouse_id
- quantity
- stock_movement_id

#### invoices

- id
- number
- customer_id
- delivery_note_id
- status
- invoice_date
- total_amount
- fiscal_status
- arca_authorization_code

### Compras

#### purchase_orders

- id
- number
- supplier_id
- status
- order_date
- expected_date

#### purchase_order_items

- id
- purchase_order_id
- product_id
- quantity
- unit_cost

#### purchase_receipts

- id
- number
- supplier_id
- purchase_order_id
- warehouse_id
- status
- receipt_date

#### purchase_receipt_items

- id
- purchase_receipt_id
- product_id
- quantity
- unit_cost

#### supplier_invoices

- id
- supplier_id
- purchase_receipt_id
- document_number
- invoice_date
- total_amount
- status

### Produccion

#### production_formulas

- id
- product_id
- version
- is_active
- valid_from

#### production_formula_items

- id
- production_formula_id
- input_product_id
- quantity
- warehouse_id

#### production_orders

- id
- number
- product_id
- formula_id
- planned_quantity
- produced_quantity
- status
- planned_date
- closed_at

#### production_order_consumptions

- id
- production_order_id
- input_product_id
- warehouse_id
- planned_quantity
- actual_quantity
- stock_movement_id

#### production_order_outputs

- id
- production_order_id
- output_product_id
- warehouse_id
- quantity
- stock_movement_id

#### production_order_scrap

- id
- production_order_id
- product_id
- quantity
- reason

### Inventario y auditoria

#### stock_movements

- id
- movement_type
- direction
- warehouse_id
- product_id
- quantity
- reference_module
- reference_document
- reference_id
- movement_date
- created_by

#### stock_balance

- id
- warehouse_id
- product_id
- quantity_on_hand
- quantity_reserved
- updated_at

#### audit_events

- id
- module
- entity_name
- entity_id
- event_type
- event_date
- user_id
- payload_json

## 6. Relaciones clave

### Ventas e inventario

- `sales_orders` 1:N `sales_order_items`
- `delivery_notes` 1:N `delivery_note_items`
- `delivery_note_items` 1:N `delivery_note_allocations`
- `delivery_note_allocations` 1:1 `stock_movements` cuando el remito se confirma
- `delivery_notes` 1:N `invoices` si se permite facturacion parcial
- cada allocation puede apuntar a un tanque especifico modelado como `warehouse`

### Compras e inventario

- `purchase_orders` 1:N `purchase_order_items`
- `purchase_receipts` 1:N `purchase_receipt_items`
- cada `purchase_receipt_item` genera movimientos de entrada en `stock_movements`
- `supplier_invoices` se asocia a la recepcion o directamente a la orden segun operacion

### Produccion e inventario

- `production_formulas` 1:N `production_formula_items`
- `production_orders` pertenece a una formula
- `production_order_consumptions` genera salidas de stock
- `production_order_outputs` genera entradas de stock

## 7. Flujos principales

### Flujo 1: remito con multiples depositos

1. Usuario crea el remito para un cliente.
2. Agrega items con cantidad requerida.
3. Para cada item, el sistema permite asignar cantidades desde uno o varios depositos.
4. El backend valida que:
   - la suma de allocations sea igual a la cantidad del item
   - haya stock suficiente en cada deposito
5. Al confirmar el remito:
   - cambia estado del remito a `confirmed`
   - genera un `stock_movement` de salida por cada allocation
   - actualiza `stock_balance`
   - registra evento en `audit_events`
6. El historial debe permitir ver exactamente desde que depositos salio cada unidad.

### Flujo 1b: remito desde tanques con nombre comercial variable

1. El usuario selecciona el producto base fisico.
2. El sistema propone los tanques habilitados para ese producto.
3. El usuario distribuye cantidades entre uno o varios tanques.
4. El sistema define el `display_name` del item segun cliente, marca o tipo de remito.
5. El documento muestra el nombre comercial correcto.
6. El stock se descuenta siempre del producto base y del tanque real.

### Flujo 2: recepcion de compra

1. Usuario crea una orden de compra.
2. Registra recepcion total o parcial.
3. El backend genera movimientos de entrada en stock.
4. Se actualiza el balance del deposito receptor.
5. Se registra el evento en auditoria.

### Flujo 3: orden de produccion

1. Usuario selecciona producto a fabricar y formula activa.
2. Define cantidad objetivo.
3. El sistema calcula consumo teorico de materia prima.
4. Al iniciar o confirmar el consumo:
   - genera movimientos de salida para insumos
   - registra consumos teoricos y reales
5. Al cerrar produccion:
   - genera movimiento de entrada para producto terminado
   - registra mermas si existieron
   - registra auditoria completa del proceso

### Flujo 4: facturacion

1. Usuario factura desde remito confirmado o desde pedido segun politica.
2. Se genera comprobante interno con estado `pending_fiscal`.
3. Si existe integracion con ARCA:
   - se envia el comprobante al servicio fiscal
   - se guarda respuesta, CAE y vencimiento
4. Si no existe integracion aun:
   - el documento queda como factura interna no fiscal
5. Todo intento y respuesta queda auditado.

## 8. Reglas de negocio iniciales

- ningun remito confirmado puede tener items sin allocation
- ninguna allocation puede exceder el stock disponible del deposito
- todo movimiento de stock debe tener documento origen
- toda anulacion debe generar contramovimiento o reversa explicita
- no se debe editar un documento confirmado sin trazabilidad
- una formula debe poder versionarse sin pisar historicos
- una orden de produccion cerrada no debe modificarse
- un tanque puede restringirse a uno o mas productos permitidos
- el remito puede imprimir un alias comercial distinto al nombre base del producto
- el alias comercial no debe generar un stock separado si el producto fisico es el mismo

## 9. API inicial sugerida

### Autenticacion

- `POST /auth/login`
- `GET /auth/me`

### Maestros

- `GET /products`
- `POST /products`
- `GET /warehouses`
- `POST /warehouses`
- `GET /customers`
- `POST /customers`
- `GET /suppliers`
- `POST /suppliers`

### Ventas

- `GET /sales-orders`
- `POST /sales-orders`
- `GET /delivery-notes`
- `POST /delivery-notes`
- `POST /delivery-notes/{id}/confirm`
- `GET /delivery-notes/{id}/traceability`
- `POST /invoices`

### Compras

- `GET /purchase-orders`
- `POST /purchase-orders`
- `POST /purchase-receipts`

### Produccion

- `GET /production-formulas`
- `POST /production-formulas`
- `GET /production-orders`
- `POST /production-orders`
- `POST /production-orders/{id}/consume`
- `POST /production-orders/{id}/close`

### Inventario y auditoria

- `GET /stock-balances`
- `GET /stock-movements`
- `GET /audit-events`
- `GET /dashboards/sales`
- `GET /dashboards/inventory`
- `GET /dashboards/production`

## 10. Pantallas iniciales

- login
- dashboard general
- productos
- clientes
- proveedores
- depositos
- tanques
- pedido de venta
- remito
- trazabilidad de remito
- orden de compra
- recepcion de compra
- formula de produccion
- orden de produccion
- movimientos de stock
- auditoria

## 11. Orden recomendado de implementacion

### Fase 1

- autenticacion y permisos
- maestros base
- depositos
- productos con stock
- estructura de auditoria

### Fase 2

- stock balance
- stock movements
- tanques como depositos fisicos
- remitos multi-deposito
- alias comercial por remito
- trazabilidad por remito

### Fase 3

- pedidos de venta
- facturacion interna
- cuenta corriente clientes

### Fase 4

- compras
- recepciones
- cuentas corrientes proveedores

### Fase 5

- formulas
- produccion
- consumo y altas

### Fase 6

- dashboards
- reportes consolidados
- integracion con ARCA

## 12. Stack sugerido

Una opcion pragmatica para este proyecto:

- frontend: React + Next.js
- backend: NestJS o Express con TypeScript
- base de datos: PostgreSQL
- ORM: Prisma
- autenticacion: JWT + refresh tokens
- UI: componente administrativo simple y rapido
- graficos: libreria ligera para dashboards

## 13. Riesgos tecnicos a cuidar

- mezclar stock fisico con stock reservado sin reglas claras
- permitir editar historicos sin auditoria
- no usar transacciones en confirmacion de remitos o produccion
- acoplar demasiado temprano ARCA al flujo comercial
- no contemplar recepciones o despachos parciales
- no modelar bien anulaciones y reversas
- duplicar productos por marca o nombre comercial cuando en realidad el stock fisico es el mismo
