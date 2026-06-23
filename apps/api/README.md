# API ERP

Backend inicial del ERP propio para desarrollo local.

## Stack

- Express
- TypeScript
- Prisma
- SQLite para desarrollo local

## Primer alcance

- usuarios
- productos
- depositos
- stock por deposito
- remitos con multiples depositos por item
- auditoria de movimientos

## Comandos

```bash
npm install
npm run prisma:generate
npm run seed
npm run dev
```

## Migraciones

La migracion inicial ya esta versionada en `prisma/migrations/20260311_init/migration.sql`.

Comando esperado para aplicar migraciones:

```bash
npx prisma migrate dev
```

## Seed de prueba

`npm run seed` carga:

- 1 usuario administrador
- 1 cliente demo
- 2 depositos
- 2 productos
- stock inicial distribuido entre depositos

Con esos datos ya se puede probar un remito multi-deposito.

## Flujo de prueba sugerido

1. Levantar la API:

```bash
npm run dev
```

2. Ver stock inicial:

```bash
GET /api/stock-balances
```

3. Crear un remito con multiples depositos:

```json
POST /api/delivery-notes
{
  "number": "R-000001",
  "customerId": "ID_CLIENTE",
  "deliveryDate": "2026-03-11T10:00:00.000Z",
  "createdByUserId": "ID_USUARIO",
  "items": [
    {
      "productId": "ID_PRODUCTO_A",
      "quantity": 10,
      "allocations": [
        { "warehouseId": "ID_DEPOSITO_CENTRAL", "quantity": 6 },
        { "warehouseId": "ID_DEPOSITO_PICKING", "quantity": 4 }
      ]
    },
    {
      "productId": "ID_PRODUCTO_B",
      "quantity": 5,
      "allocations": [
        { "warehouseId": "ID_DEPOSITO_PICKING", "quantity": 5 }
      ]
    }
  ]
}
```

4. Confirmar el remito:

```json
POST /api/delivery-notes/:id/confirm
{
  "userId": "ID_USUARIO"
}
```

5. Revisar trazabilidad y movimientos:

```bash
GET /api/delivery-notes/:id/traceability
GET /api/stock-movements
GET /api/stock-balances
```

## Variables de entorno

Ya se incluye un `apps/api/.env` listo para desarrollo local con SQLite.

Si mas adelante quieren pasar a PostgreSQL, solo hay que cambiar el datasource y la `DATABASE_URL`.
