# Estado Actual

## Lo que ya funciona

- backend base con Express, TypeScript y Prisma
- base local SQLite para desarrollo
- seed con usuario, cliente, productos y tanques reales
- remitos multi-deposito
- confirmacion de remitos con descuento de stock
- movimientos de stock
- trazabilidad por remito
- interfaz web con modulos y sidebar
- modulo `Stock y Depositos` con subnavegacion
- representacion grafica de estado de tanques

## Reglas ya decididas

- los tanques se tratan como depositos fisicos
- un remito puede salir de varios depositos o tanques
- `Solucion urea 32,5` y `OPTI-BLUE Solucion de urea al 32,5` comparten stock base
- los bidones se resolveran despues desde produccion

## Proximo paso recomendado

- sugerir automaticamente tanques validos segun producto
- permitir alias comercial en remito para `Solucion urea 32,5 / OPTI-BLUE`
- bloquear combinaciones invalidas tanque-producto

## Contexto minimo para futuras conversaciones

Tomar como base:

- `docs/erp-discovery.md`
- `docs/mvp-technical-design.md`
- `docs/stock-rules.md`
- `docs/current-status.md`
- `docs/sales-rules.md`
