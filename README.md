# ERP Propio

Base inicial para definir y construir un ERP enfocado en cubrir las deficiencias del sistema actual de la empresa.

## Objetivo

No empezar por pantallas o tablas sueltas, sino por:

1. Detectar qué procesos hoy generan fricción.
2. Priorizar qué módulos tienen mayor impacto.
3. Definir un MVP implementable.
4. Construir una arquitectura que permita crecer sin rehacer todo.

## Documentos

- `docs/erp-discovery.md`: guía de descubrimiento, alcance inicial, módulos, arquitectura y roadmap.
- `docs/mvp-technical-design.md`: diseño técnico inicial del MVP, entidades, relaciones y flujos principales.
- `docs/stock-rules.md`: reglas compactas del módulo Stock y Depósitos.
- `docs/sales-rules.md`: reglas compactas del módulo Ventas.
- `docs/current-status.md`: estado actual del proyecto y próximo paso recomendado.
- `docs/calculadora-costos-deploy.md`: guia para publicar la calculadora de costos como app web simple.

## Siguiente paso recomendado

Completar primero la sección "Brechas del ERP actual" en `docs/erp-discovery.md`.

Con eso vamos a poder decidir si conviene arrancar por:

- ventas y facturación
- stock y compras
- finanzas y cobranzas
- producción
- reportes y tableros

## Estado tecnico actual

Ya existe una base inicial de backend en `apps/api` con Prisma y una configuracion local orientada a desarrollo rapido.

Tambien existe una interfaz web minima en `apps/web` para validar:

- stock por deposito
- creacion de remitos multi-deposito
- confirmacion de remitos
- trazabilidad del documento

## Como levantar el proyecto

### Backend

```bash
cd apps/api
npm run seed
npm run dev
```

API disponible en `http://localhost:3001/api`

### Frontend

En otra terminal:

```bash
cd apps/web
npx next dev
```

Interfaz disponible en `http://localhost:3000`
