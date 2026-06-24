"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import styles from "./cost-executive-kpis.module.css";

type StoredWorkbook = {
  fileName: string;
  workbook: XLSX.WorkBook;
};

type ParsedSale = {
  articulo: string;
  producto: string;
  cantidad: number;
  litros: number;
  total: number;
};

type ParsedPurchase = {
  articulo: string;
  proveedor: string;
  familia: string;
  control: "alta" | "media" | "baja";
  total: number;
};

type Lever = {
  familia: string;
  total: number;
  share: number;
  impact: number;
  control: "alta" | "media" | "baja";
};

const PURCHASE_FILE_STORAGE_KEY = "erp-costos-ultimo-archivo-compras-v1";
const SALES_FILE_STORAGE_KEY = "erp-costos-ultimo-archivo-ventas-v1";

const PRODUCT_RULES = [
  { match: "OPTI-BLUE", producto: "OptiBlue", factor: 1 },
  { match: "OPTI BLUE", producto: "OptiBlue", factor: 1 },
  { match: "BIDON 10", producto: "OptiBlue 10L", factor: 10 },
  { match: "BIDON 20", producto: "OptiBlue 20L", factor: 20 },
  { match: "UREA INDUSTRIAL", producto: "Industrial", factor: 1 },
  { match: "SOLUCION UREA INDUSTRIAL", producto: "Industrial", factor: 1 },
  { match: "OPTIPURE", producto: "OptiPure", factor: 1 },
];

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function key(value: unknown) {
  return stripAccents(String(value ?? "").trim()).replace(/\s+/g, " ").toUpperCase();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function num(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/[^\d.-]/g, "");
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function number(value: number, digits = 0) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value || 0);
}

function pct(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function base64ToArrayBuffer(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function parseStoredWorkbook(payload: string | null): StoredWorkbook | null {
  if (!payload) return null;
  const saved = JSON.parse(payload) as { fileName: string; data: string };
  return {
    fileName: saved.fileName,
    workbook: XLSX.read(base64ToArrayBuffer(saved.data), {
      type: "array",
      cellDates: true,
    }),
  };
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: false,
    defval: "",
    header: 1,
  });
}

function findColumn(row: unknown[], matcher: (value: string) => boolean) {
  return row.findIndex((cell) => matcher(key(cell)));
}

function classifyProduct(articulo: string, cantidad: number) {
  const normalized = key(articulo);
  const rule = PRODUCT_RULES.find((item) => normalized.includes(item.match));
  if (!rule) return { producto: "Otros", litros: 0 };
  return { producto: rule.producto, litros: cantidad * rule.factor };
}

function classifyPurchase(articulo: string, proveedor: string): Pick<ParsedPurchase, "familia" | "control"> {
  const value = `${key(articulo)} ${key(proveedor)}`;

  if (value.includes("UREA")) return { familia: "Materia prima", control: "media" };
  if (value.includes("BIDON") || value.includes("ETIQUETA") || value.includes("CALCOMANIA")) {
    return { familia: "Envases y etiquetas", control: "alta" };
  }
  if (value.includes("FLETE")) return { familia: "Fletes", control: "media" };
  if (value.includes("COMBUSTIBLE") || value.includes("VIATIC") || value.includes("PEAJE")) {
    return { familia: "Logistica", control: "alta" };
  }
  if (value.includes("GAS")) return { familia: "Gas", control: "media" };
  if (
    value.includes("ENERGIA") ||
    value.includes("MANTENIMIENTO") ||
    value.includes("FERRETERIA") ||
    value.includes("LABORATORIO") ||
    value.includes("LIMPIEZA")
  ) {
    return { familia: "Fabril", control: "media" };
  }
  if (value.includes("IMPUEST") || value.includes("IIBB")) return { familia: "Impuestos", control: "baja" };
  if (
    value.includes("HONORARIO") ||
    value.includes("INTERNET") ||
    value.includes("TELEFONO") ||
    value.includes("PUBLICIDAD") ||
    value.includes("LIBRERIA")
  ) {
    return { familia: "Administracion y comercial", control: "media" };
  }
  return { familia: "Otros costos", control: "media" };
}

function parseSales(workbook: XLSX.WorkBook | null) {
  if (!workbook) return [];
  const standardSheet = workbook.Sheets.VENTAS_RAW;
  if (standardSheet) {
    return XLSX.utils
      .sheet_to_json<Record<string, unknown>>(standardSheet, { defval: "" })
      .map((row) => {
        const articulo = text(row.Articulo_ERP);
        const cantidad = num(row.Cantidad);
        const classified = classifyProduct(articulo, cantidad);
        return {
          articulo,
          producto: classified.producto,
          cantidad,
          litros: classified.litros,
          total: num(row.Total_Neto),
        };
      })
      .filter((row) => row.articulo || row.total);
  }

  for (const sheetName of workbook.SheetNames) {
    const rows = sheetRows(workbook, sheetName);
    const headerIndex = rows.findIndex((row) => row.some((cell) => key(cell) === "COMPROBANTE"));
    if (headerIndex < 0) continue;

    const header = rows[headerIndex] ?? [];
    const comprobanteColumn = findColumn(header, (value) => value === "COMPROBANTE");
    if (comprobanteColumn < 0) continue;

    const articuloColumn = Math.max(comprobanteColumn - 1, 0);
    const cantidadColumn = findColumn(header, (value) => value === "CANTIDAD");
    const totalColumn = findColumn(header, (value) => value.includes("TOTAL") && value.includes("NETO"));
    let articulo = "";
    const parsed: ParsedSale[] = [];

    rows.slice(headerIndex + 1).forEach((row) => {
      const maybeArticle = text(row[articuloColumn]);
      const comprobante = text(row[comprobanteColumn]);
      const cantidad = cantidadColumn >= 0 ? num(row[cantidadColumn]) : num(row[comprobanteColumn + 5]);
      if (maybeArticle && !comprobante && !cantidad && !["SUBTOTAL", "TOTAL", "IMPRESO:"].includes(key(maybeArticle))) {
        articulo = maybeArticle;
        return;
      }
      if (!articulo || !comprobante) return;
      const classified = classifyProduct(articulo, cantidad);
      parsed.push({
        articulo,
        producto: classified.producto,
        cantidad,
        litros: classified.litros,
        total: totalColumn >= 0 ? num(row[totalColumn]) : num(row[comprobanteColumn + 13]),
      });
    });

    if (parsed.length) return parsed;
  }

  return [];
}

function parsePurchases(workbook: XLSX.WorkBook | null) {
  if (!workbook) return [];
  const standardSheet = workbook.Sheets.COMPRAS_RAW;
  if (standardSheet) {
    return XLSX.utils
      .sheet_to_json<Record<string, unknown>>(standardSheet, { defval: "" })
      .map((row) => {
        const articulo = text(row.Articulo_ERP);
        const proveedor = text(row.Proveedor);
        return {
          articulo,
          proveedor,
          total: num(row.Total_Neto),
          ...classifyPurchase(articulo, proveedor),
        };
      })
      .filter((row) => row.articulo || row.proveedor || row.total);
  }

  for (const sheetName of workbook.SheetNames) {
    const rows = sheetRows(workbook, sheetName);
    const headerIndex = rows.findIndex((row) => row.some((cell) => key(cell) === "ARTICULO"));
    if (headerIndex < 0) continue;

    const header = rows[headerIndex] ?? [];
    const articuloColumn = findColumn(header, (value) => value === "ARTICULO");
    const comprobanteColumn = findColumn(header, (value) => value === "COMPROBANTE");
    const totalColumn = findColumn(header, (value) => value.includes("TOTAL") && value.includes("NETO"));
    if (articuloColumn < 0 || comprobanteColumn < 0) continue;

    let proveedor = "";
    const parsed: ParsedPurchase[] = [];

    rows.slice(headerIndex + 1).forEach((row) => {
      const articulo = text(row[articuloColumn]);
      const comprobante = text(row[comprobanteColumn]);
      const total = totalColumn >= 0 ? num(row[totalColumn]) : num(row[comprobanteColumn + 10]);

      if (articulo && !comprobante && !total && !["SUBTOTAL", "TOTAL", "IMPRESO:"].includes(key(articulo))) {
        proveedor = articulo;
        return;
      }
      if (!articulo || !comprobante) return;
      parsed.push({
        articulo,
        proveedor,
        total,
        ...classifyPurchase(articulo, proveedor),
      });
    });

    if (parsed.length) return parsed;
  }

  return [];
}

function buildKpis(sales: ParsedSale[], purchases: ParsedPurchase[]) {
  const facturacion = sales.reduce((total, row) => total + row.total, 0);
  const litros = sales.reduce((total, row) => total + row.litros, 0);
  const costos = purchases.reduce((total, row) => total + row.total, 0);
  const precioPromedio = litros ? facturacion / litros : 0;
  const costoPromedio = litros ? costos / litros : 0;

  const families = new Map<string, { familia: string; total: number; control: "alta" | "media" | "baja" }>();
  purchases.forEach((row) => {
    const current = families.get(row.familia) ?? {
      familia: row.familia,
      total: 0,
      control: row.control,
    };
    current.total += row.total;
    if (current.control !== "alta" && row.control === "alta") current.control = "alta";
    else if (current.control === "baja" && row.control === "media") current.control = "media";
    families.set(row.familia, current);
  });

  const levers: Lever[] = Array.from(families.values())
    .map((row) => ({
      ...row,
      share: costos ? row.total / costos : 0,
      impact: row.control === "baja" ? 0 : row.total * 0.1,
    }))
    .sort((a, b) => b.total - a.total);

  const products = new Map<string, { producto: string; litros: number; facturacion: number }>();
  sales.forEach((row) => {
    if (!row.litros) return;
    const current = products.get(row.producto) ?? { producto: row.producto, litros: 0, facturacion: 0 };
    current.litros += row.litros;
    current.facturacion += row.total;
    products.set(row.producto, current);
  });

  const productRows = Array.from(products.values())
    .map((row) => {
      const share = litros ? row.litros / litros : 0;
      const allocatedCost = costos * share;
      const margin = row.facturacion - allocatedCost;
      return {
        ...row,
        precioLitro: row.litros ? row.facturacion / row.litros : 0,
        costoLitro: row.litros ? allocatedCost / row.litros : 0,
        margenLitro: row.litros ? margin / row.litros : 0,
        pressure: row.facturacion ? allocatedCost / row.facturacion : 0,
      };
    })
    .sort((a, b) => {
      if (a.margenLitro < 0 && b.margenLitro >= 0) return -1;
      if (b.margenLitro < 0 && a.margenLitro >= 0) return 1;
      return b.pressure - a.pressure;
    });

  return {
    facturacion,
    litros,
    costos,
    precioPromedio,
    costoPromedio,
    margenPromedio: precioPromedio - costoPromedio,
    levers,
    products: productRows,
    topCost: levers[0] ?? null,
    bestLever: [...levers].sort((a, b) => b.impact - a.impact)[0] ?? null,
    riskiestProduct: productRows[0] ?? null,
  };
}

export function CostExecutiveKpis() {
  const [snapshot, setSnapshot] = useState(0);
  const [files, setFiles] = useState<{ purchases: StoredWorkbook | null; sales: StoredWorkbook | null }>({
    purchases: null,
    sales: null,
  });

  useEffect(() => {
    const load = () => {
      setFiles({
        purchases: parseStoredWorkbook(window.localStorage.getItem(PURCHASE_FILE_STORAGE_KEY)),
        sales: parseStoredWorkbook(window.localStorage.getItem(SALES_FILE_STORAGE_KEY)),
      });
    };
    load();
    const interval = window.setInterval(() => {
      setSnapshot((current) => current + 1);
      load();
    }, 2500);
    window.addEventListener("focus", load);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, []);

  const data = useMemo(() => {
    const sales = parseSales(files.sales?.workbook ?? null);
    const purchases = parsePurchases(files.purchases?.workbook ?? null);
    return {
      sales,
      purchases,
      kpis: buildKpis(sales, purchases),
    };
  }, [files, snapshot]);

  if (!files.sales && !files.purchases) return null;

  return (
    <section className={styles.executiveKpis}>
      <div className={styles.sectionHead}>
        <div>
          <p className={styles.eyebrow}>Indicadores de costos</p>
          <h2>Lectura ejecutiva</h2>
          <p>
            Resumen automatico basado en los archivos cargados. Usa compras para detectar palancas de costo y ventas para
            ponderar el impacto por litro.
          </p>
        </div>
        <div className={styles.fileSummary}>
          {files.sales ? <span>{files.sales.fileName}</span> : null}
          {files.purchases ? <span>{files.purchases.fileName}</span> : null}
        </div>
      </div>

      <div className={styles.insightGrid}>
        <article className={styles.insightCard}>
          <span>Costo dominante</span>
          <strong>{data.kpis.topCost?.familia ?? "Sin compras"}</strong>
          <p>{data.kpis.topCost ? `${pct(data.kpis.topCost.share)} del costo cargado.` : "Carga compras para verlo."}</p>
        </article>
        <article className={styles.insightCard}>
          <span>Palanca reducible</span>
          <strong>{data.kpis.bestLever?.familia ?? "Sin palanca"}</strong>
          <p>
            {data.kpis.bestLever
              ? `Reducir 10% impacta aprox. ${money(data.kpis.bestLever.impact)}.`
              : "No hay costos controlables detectados."}
          </p>
        </article>
        <article className={styles.insightCard}>
          <span>Producto bajo presion</span>
          <strong>{data.kpis.riskiestProduct?.producto ?? "Sin ventas"}</strong>
          <p>
            {data.kpis.riskiestProduct
              ? `${pct(data.kpis.riskiestProduct.pressure)} del precio queda absorbido por costos asignados.`
              : "Carga ventas para calcular presion por producto."}
          </p>
        </article>
        <article className={styles.insightCard}>
          <span>Margen estimado/L</span>
          <strong className={data.kpis.margenPromedio < 0 ? styles.negative : undefined}>
            {money(data.kpis.margenPromedio)}
          </strong>
          <p>
            Precio {money(data.kpis.precioPromedio)} / L vs costo asignado {money(data.kpis.costoPromedio)} / L.
          </p>
        </article>
      </div>

      <div className={styles.leverBoard}>
        <article className={styles.leverPanel}>
          <div>
            <p className={styles.eyebrow}>Palancas</p>
            <h3>Que costos conviene mirar primero</h3>
          </div>
          <div className={styles.leverList}>
            {data.kpis.levers.slice(0, 6).map((lever) => (
              <div className={styles.leverRow} key={lever.familia}>
                <div>
                  <strong>{lever.familia}</strong>
                  <span>Control {lever.control}</span>
                </div>
                <div>
                  <strong>{money(lever.total)}</strong>
                  <span>{pct(lever.share)} - impacto 10% {money(lever.impact)}</span>
                </div>
              </div>
            ))}
            {!data.kpis.levers.length ? <p className={styles.emptyInsight}>Carga compras para ver palancas.</p> : null}
          </div>
        </article>
        <article className={styles.leverPanel}>
          <div>
            <p className={styles.eyebrow}>Productos</p>
            <h3>Margen y presion estimada</h3>
          </div>
          <div className={styles.leverList}>
            {data.kpis.products.slice(0, 5).map((product) => (
              <div className={styles.leverRow} key={product.producto}>
                <div>
                  <strong>{product.producto}</strong>
                  <span>{number(product.litros)} L - precio {money(product.precioLitro)} / L</span>
                </div>
                <div>
                  <strong className={product.margenLitro < 0 ? styles.negative : undefined}>
                    {money(product.margenLitro)}
                  </strong>
                  <span>{pct(product.pressure)} presion</span>
                </div>
              </div>
            ))}
            {!data.kpis.products.length ? <p className={styles.emptyInsight}>Carga ventas para ver productos.</p> : null}
          </div>
        </article>
      </div>
    </section>
  );
}
