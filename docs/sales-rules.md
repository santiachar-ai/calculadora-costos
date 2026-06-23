# Reglas de Ventas

## Objetivo

Documento corto para concentrar las reglas funcionales del modulo `Ventas`.

## Alcance inicial

- clientes
- listas de precios
- pedidos de venta
- remitos
- facturacion interna
- cuenta corriente de clientes
- cobranzas basicas

## Regla comercial principal

El flujo de ventas debe poder operar aunque la integracion fiscal con ARCA todavia no este implementada.

Eso implica separar:

- documento comercial interno
- autorizacion fiscal electronica

## Relacion con stock

- un pedido de venta no debe descontar stock fisico por si mismo
- el descuento real de stock ocurre al confirmar el remito
- un remito puede salir de uno o varios depositos o tanques
- la trazabilidad del remito debe reconstruir el origen real del producto

## Productos con alias comercial

Algunos productos pueden compartir stock base y cambiar solo el nombre mostrado en el documento.

Caso conocido:

- producto base: `Solucion urea 32,5`
- alias comercial posible: `OPTI-BLUE Solucion de urea al 32,5`

## Flujo sugerido

1. Alta o seleccion de cliente.
2. Carga de pedido de venta.
3. Generacion de remito.
4. Asignacion de stock por deposito o tanque.
5. Confirmacion de remito.
6. Emision de factura interna.
7. Integracion fiscal posterior con ARCA.

## Reglas para la siguiente etapa

- sugerir tanques validos segun producto
- permitir alias comercial por cliente o tipo de remito
- evitar mezclar en un item tanques incompatibles con el producto
- mantener cuenta corriente de cliente separada del movimiento de stock

## Fuera de alcance por ahora

- cobranzas complejas
- subdiarios completos
- cierre de caja comercial
- integracion fiscal completa con ARCA
