"use client";

import { useMemo } from "react";
import * as XLSX from "xlsx";
import { CostCalculator } from "./cost-calculator";

type SheetRow = unknown[];

let salesParserPatchInstalled = false;

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function findColumn(row: SheetRow, predicate: (value: string) => boolean) {
  return row.findIndex((cell) => predicate(normalize(cell)));
}

function normalizeSalesRows(rows: SheetRow[]) {
  const looksLikeStockMovement = rows
    .slice(0, 8)
    .some((row) =>
      row.some((cell) => {
        const value = normalize(cell);
        return value.includes("MOVIMIENTOS DE MERCADERIA") || value.includes("MOVIMIENTOS DE MERCADERÍA");
      }),
    );
  if (looksLikeStockMovement) return rows;

  const titleFound = rows
    .slice(0, 8)
    .some((row) =>
      row.some((cell) => {
        const value = normalize(cell);
        return value.includes("DETALLE DE VENTAS") && value.includes("ARTICULO");
      }),
    );
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => normalize(cell) === "COMPROBANTE"),
  );

  if (!titleFound && headerIndex < 0) return rows;

  const headerRow = rows[headerIndex] ?? [];
  const comprobanteColumn = findColumn(headerRow, (value) => value === "COMPROBANTE");
  if (comprobanteColumn < 0 || (headerIndex === 2 && comprobanteColumn === 2)) return rows;

  const articleColumn = Math.max(comprobanteColumn - 1, 0);
  const clienteColumn = findColumn(headerRow, (value) => value === "CLIENTE");
  const cantidadColumn = findColumn(headerRow, (value) => value === "CANTIDAD");
  const unidadColumn = findColumn(headerRow, (value) => value === "UNIDAD");
  const precioColumn = findColumn(
    headerRow,
    (value) => value.includes("PRECIO") && value.includes("UNIT"),
  );
  const totalNetoColumn = findColumn(
    headerRow,
    (value) => value.includes("TOTAL") && value.includes("NETO"),
  );
  const totalFinalColumn = findColumn(
    headerRow,
    (value) => value.includes("TOTAL") && value.includes("FINAL"),
  );
  const pendienteColumn = findColumn(headerRow, (value) => value.includes("PENDIENTE"));

  const normalizedRows: SheetRow[] = [
    ["", "DETALLE DE VENTAS POR ARTICULO"],
    [],
    [
      "",
      "ARTICULO",
      "COMPROBANTE",
      "",
      "",
      "CLIENTE",
      "",
      "CANTIDAD",
      "UNIDAD",
      "PRECIO UNIT NETO",
      "",
      "",
      "",
      "",
      "",
      "TOTAL NETO",
      "TOTAL FINAL",
      "",
      "PENDIENTE",
    ],
  ];

  rows.slice(headerIndex + 1).forEach((row) => {
    const normalizedRow: SheetRow = [];
    normalizedRow[1] = row[articleColumn];
    normalizedRow[2] = row[comprobanteColumn];
    normalizedRow[5] = clienteColumn >= 0 ? row[clienteColumn] : row[comprobanteColumn + 3];
    normalizedRow[7] = cantidadColumn >= 0 ? row[cantidadColumn] : row[comprobanteColumn + 5];
    normalizedRow[8] = unidadColumn >= 0 ? row[unidadColumn] : row[comprobanteColumn + 6];
    normalizedRow[9] = precioColumn >= 0 ? row[precioColumn] : row[comprobanteColumn + 7];
    normalizedRow[15] = totalNetoColumn >= 0 ? row[totalNetoColumn] : row[comprobanteColumn + 13];
    normalizedRow[16] = totalFinalColumn >= 0 ? row[totalFinalColumn] : row[comprobanteColumn + 14];
    normalizedRow[18] = pendienteColumn >= 0 ? row[pendienteColumn] : row[comprobanteColumn + 16];
    normalizedRows.push(normalizedRow);
  });

  return normalizedRows;
}

function installSalesParserPatch() {
  if (salesParserPatchInstalled) return;

  const originalSheetToJson = XLSX.utils.sheet_to_json;
  type SheetToJsonArgs = Parameters<typeof XLSX.utils.sheet_to_json>;
  const utils = XLSX.utils as typeof XLSX.utils & {
    sheet_to_json: typeof XLSX.utils.sheet_to_json;
  };

  utils.sheet_to_json = ((sheet: SheetToJsonArgs[0], options?: SheetToJsonArgs[1]) => {
    const rows = originalSheetToJson(sheet, options);
    if (
      options &&
      "header" in options &&
      options.header === 1 &&
      Array.isArray(rows) &&
      rows.every((row) => Array.isArray(row))
    ) {
      return normalizeSalesRows(rows as SheetRow[]);
    }

    return rows;
  }) as typeof XLSX.utils.sheet_to_json;

  salesParserPatchInstalled = true;
}

export function CostCalculatorOnline() {
  useMemo(() => {
    installSalesParserPatch();
  }, []);

  return <CostCalculator />;
}
