# Reglas de Stock

## Objetivo

Documento corto con las reglas de negocio mas importantes del modulo `Stock y Depositos`.

## Regla principal

Un remito puede descontar stock desde mas de un deposito o tanque.

## Remitos multi-deposito

- un mismo item del remito puede dividirse en varias imputaciones
- cada imputacion indica deposito o tanque real de origen
- la suma de las imputaciones debe coincidir con la cantidad remitida
- al confirmar el remito, el sistema genera un movimiento de stock por cada imputacion
- no se deben hacer movimientos internos posteriores para "corregir" el origen

## Tanques

Los tanques se modelan como depositos fisicos.

### Asignacion actual

- Tanque 1, 2 y 5: `Solucion Urea Industrial`
- Tanque 3, 4, 6 y 8: `Solucion urea 32,5`
- Tanque 7: `Urkem urea automotor liquida`

## Nombre comercial

`Solucion urea 32,5` y `OPTI-BLUE Solucion de urea al 32,5` son el mismo producto base para stock.

- el stock se controla sobre el producto base
- el remito puede imprimir un alias comercial distinto
- no debe existir stock duplicado solo por cambiar nombre de documento

## Formatos de venta

- granel
- IBC de 1000 litros
- bidones de 10 y 20 litros

## Etapa actual

- tanques reales
- stock por tanque
- remitos multi-deposito
- trazabilidad de movimientos

## Etapa posterior

Produccion de bidones:

- consume producto terminado desde un tanque
- da de alta producto envasado en otro deposito
