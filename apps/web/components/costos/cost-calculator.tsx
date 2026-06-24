"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type RawRow = Record<string, unknown>;

type PurchaseRule = {
  articulo: string;
  proveedor: string;
  tipo: string;
  producto: string;
};

type SalesRule = {
  articulo: string;
  tipo: string;
  producto: string;
  generaLitros: boolean;
  factor: number;
};

type CostParams = {
  concentracionOptiblue: number;
  concentracionIndustrial: number;
  densidadOptiblue: number;
  densidadIndustrial: number;
  costoUreaOptiblueTon: number;
  costoBidon10: number;
  costoBidon20: number;
  costoEtiqueta15: number;
  costoEtiqueta23: number;
  costoOptipureGranelLitro: number;
  costoBidonOptipure: number;
  costoEtiquetaOptipure: number;
  costoBotellaMuestra: number;
  costoTapaMuestra: number;
  costoPrecinto: number;
  consumoMuestrasPorComprobante: number;
  consumoPrecintosPorIbc: number;
  litrosPorIbc: number;
  pctCombustibleOptiblue: number;
  costoVariableFazonLitro: number;
  iibbPct: number;
  comisionPct: number;
  sueldosAdmin: number;
  sueldosProduccion: number;
  litrosOptiblueIbc: number;
  litrosIndustrial: number;
  litrosFazon325: number;
  litrosFazonIndustrial: number;
};

type PurchaseRow = {
  comprobante: string;
  articulo: string;
  proveedor: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  tipo: string;
  producto: string;
};

type SaleRow = {
  articulo: string;
  comprobante: string;
  cliente: string;
  cantidad: number;
  total: number;
  tipo: string;
  producto: string;
  litros: number;
  revisar: boolean;
};

type ProductResult = {
  producto: string;
  litros: number;
  facturacion: number;
  precioLitro: number;
  costoLitro: number;
  margenLitro: number;
  margenTotal: number;
};

type CostDriver = {
  label: string;
  value: number;
  share: number;
  reductionImpact: number;
  controllability: "alta" | "media" | "baja";
};

type ProductCostDrivers = {
  producto: string;
  litros: number;
  precioLitro: number;
  costoLitro: number;
  costoGestionLitro: number;
  margenGestionLitro: number;
  drivers: CostDriver[];
  topDriver: CostDriver | null;
  reducibleTotal: number;
  opportunity: string;
};

type CostLever = {
  label: string;
  value: number;
  share: number;
  reductionImpact: number;
  controllability: "alta" | "media" | "baja";
  affectedProducts: number;
};

type CostRisk = {
  producto: string;
  margenGestionLitro: number;
  costoGestionLitro: number;
  precioLitro: number;
  litros: number;
  pressure: number;
};

type CostInsights = {
  topGlobalDriver: CostLever | null;
  bestReductionLever: CostLever | null;
  riskiestProduct: CostRisk | null;
  totalReduciblePerLiter: number;
  topLevers: CostLever[];
  risks: CostRisk[];
};

type CostModel = {
  purchases: PurchaseRow[];
  sales: SaleRow[];
  products: ProductResult[];
  costDrivers: ProductCostDrivers[];
  insights: CostInsights;
  kpis: {
    litrosTotales: number;
    facturacionAnalizada: number;
    facturacionTotal: number;
    resultadoIndustrial: number;
    gastosAdmin: number;
    gastosComerciales: number;
    costosFijos: number;
    resultadoCore: number;
    resultadoNetoLitro: number;
    margenEquilibrioLitro: number;
    puntoEquilibrioLitros: number;
    logisticaOptiblueLitro: number;
    costoFabrilLitro: number;
    gasIndustrialLitro: number;
    muestrasPorLitro: number;
    precintosPorLitro: number;
    costoBotellaMuestra: number;
    costoTapaMuestra: number;
    costoPrecinto: number;
    comprobantesConMuestra: number;
    ibcConPrecinto: number;
  };
  review: {
    compras: number;
    ventas: number;
    comprasRevisar: number;
    ventasRevisar: number;
  };
};

const STORAGE_KEY = "erp-costos-parametros-v1";
const PURCHASE_RULES_STORAGE_KEY = "erp-costos-reglas-compras-v1";
const SALES_RULES_STORAGE_KEY = "erp-costos-reglas-ventas-v1";
const PURCHASE_FILE_STORAGE_KEY = "erp-costos-ultimo-archivo-compras-v1";
const SALES_FILE_STORAGE_KEY = "erp-costos-ultimo-archivo-ventas-v1";
const COST_MODEL_SNAPSHOT_STORAGE_KEY = "erp-costos-modelo-calculado-v1";

const PURCHASE_TYPES = [
  "MP",
  "MP_FLETE",
  "FLETE",
  "GASTO_COMERCIAL",
  "COMPENSACION_IF",
  "LOGISTICA_COMB",
  "LOGISTICA",
  "GAS",
  "ADMIN",
  "ADMIN VARIOS",
  "ADMIN IVA",
  "IMPUESTOS",
  "FABRIL_ELECTRICIDAD",
  "FABRIL_MANTENIMIENTO",
  "FABRIL_INSUMOS",
  "FABRIL_SEGURIDAD",
  "COSTO FIJO",
  "INVERSION",
  "INSUMO_CONTROL",
  "ENVASE_CONTROL",
  "ETIQUETA_CONTROL",
  "ACCESORIO_COMPRA",
  "NO_COSTO",
  "RESULTADO_FINANCIERO",
  "OTROS",
];

const PURCHASE_TYPE_DETAILS: Record<
  string,
  { label: string; description: string; impact: "suma costo" | "resta ingreso" | "fuera del costo" | "revisar" }
> = {
  MP: {
    label: "Materia prima directa",
    description: "Insumos que forman parte directa del producto terminado.",
    impact: "suma costo",
  },
  MP_FLETE: {
    label: "Flete de materia prima",
    description: "Transporte asociado a la compra de materia prima.",
    impact: "suma costo",
  },
  FLETE: {
    label: "Flete operativo",
    description: "Transporte que debe asignarse a una familia o producto.",
    impact: "suma costo",
  },
  GASTO_COMERCIAL: {
    label: "Gasto comercial",
    description: "Gastos de venta, publicidad, comisiones o acciones comerciales.",
    impact: "suma costo",
  },
  COMPENSACION_IF: {
    label: "Compensacion IF",
    description: "Factura recibida por asesoramiento comercial que compensa servicios de fazon IF.",
    impact: "resta ingreso",
  },
  LOGISTICA_COMB: {
    label: "Combustible logistico",
    description: "Combustible de reparto o movimientos logisticos.",
    impact: "suma costo",
  },
  LOGISTICA: {
    label: "Logistica",
    description: "Peajes, viaticos y gastos logisticos operativos.",
    impact: "suma costo",
  },
  GAS: {
    label: "Gas industrial",
    description: "Gas o energia termica asignada a produccion industrial.",
    impact: "suma costo",
  },
  ADMIN: {
    label: "Administracion",
    description: "Gastos administrativos generales.",
    impact: "suma costo",
  },
  "ADMIN VARIOS": {
    label: "Administracion varios",
    description: "Gastos administrativos menores o mixtos.",
    impact: "suma costo",
  },
  "ADMIN IVA": {
    label: "Administracion IVA",
    description: "Gastos administrativos con tratamiento especial de IVA.",
    impact: "suma costo",
  },
  IMPUESTOS: {
    label: "Impuestos",
    description: "Impuestos no recuperables o cargos fiscales de gestion.",
    impact: "suma costo",
  },
  FABRIL_ELECTRICIDAD: {
    label: "Fabril electricidad",
    description: "Electricidad e insumos electricos de planta.",
    impact: "suma costo",
  },
  FABRIL_MANTENIMIENTO: {
    label: "Fabril mantenimiento",
    description: "Mantenimiento de maquinaria, galpon o instalaciones productivas.",
    impact: "suma costo",
  },
  FABRIL_INSUMOS: {
    label: "Fabril insumos",
    description: "Insumos de laboratorio, limpieza o ferreteria asociados a planta.",
    impact: "suma costo",
  },
  FABRIL_SEGURIDAD: {
    label: "Fabril seguridad",
    description: "Servicios de seguridad o area protegida de planta.",
    impact: "suma costo",
  },
  "COSTO FIJO": {
    label: "Costo fijo",
    description: "Costos estructurales no variables por litro.",
    impact: "suma costo",
  },
  INVERSION: {
    label: "Inversion",
    description: "Obras, maquinaria o mejoras que no deberian ir al costo mensual operativo.",
    impact: "fuera del costo",
  },
  INSUMO_CONTROL: {
    label: "Insumos de control",
    description: "Muestras, precintos y materiales usados para control de calidad/trazabilidad.",
    impact: "suma costo",
  },
  ENVASE_CONTROL: {
    label: "Envases controlados",
    description: "Bidones o envases que alimentan costos unitarios controlados por parametro.",
    impact: "suma costo",
  },
  ETIQUETA_CONTROL: {
    label: "Etiquetas controladas",
    description: "Etiquetas que alimentan costos unitarios controlados por parametro.",
    impact: "suma costo",
  },
  ACCESORIO_COMPRA: {
    label: "Accesorio comprado",
    description: "IBC, tarimas, tambores u otros accesorios comprados para reventa o uso operativo.",
    impact: "suma costo",
  },
  NO_COSTO: {
    label: "No costo",
    description: "Movimientos que deben quedar fuera del calculo de costos.",
    impact: "fuera del costo",
  },
  RESULTADO_FINANCIERO: {
    label: "Resultado financiero",
    description: "Diferencias de cambio y ajustes financieros.",
    impact: "fuera del costo",
  },
  OTROS: {
    label: "Otros",
    description: "Categoria temporal hasta definir una imputacion mas precisa.",
    impact: "revisar",
  },
};

const PURCHASE_PRODUCTS = [
  "Industrial",
  "OptiBlue",
  "Planta",
  "Comercial",
  "Administracion",
  "Empresa",
  "Logistica",
  "Control",
  "Envases",
  "Financiero",
  "IF Compensacion",
];

const SALES_TYPES = ["PRODUCTO", "SERVICIO", "ACCESORIO", "OTROS"];
type CostView = "calculo" | "imputacion" | "maestro";

type CostConfigurationPayload = {
  params: CostParams | null;
  purchaseRules: PurchaseRule[];
  salesRules: SalesRule[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
const COSTS_CONFIG_MODE =
  process.env.NEXT_PUBLIC_COSTS_CONFIG_MODE ?? "api";

const DEFAULT_PARAMS: CostParams = {
  concentracionOptiblue: 0.325,
  concentracionIndustrial: 0.46,
  densidadOptiblue: 1.09,
  densidadIndustrial: 1.12,
  costoUreaOptiblueTon: 786775,
  costoBidon10: 2440,
  costoBidon20: 5273,
  costoEtiqueta15: 450,
  costoEtiqueta23: 1100,
  costoOptipureGranelLitro: 0,
  costoBidonOptipure: 0,
  costoEtiquetaOptipure: 0,
  costoBotellaMuestra: 0,
  costoTapaMuestra: 0,
  costoPrecinto: 0,
  consumoMuestrasPorComprobante: 2,
  consumoPrecintosPorIbc: 2,
  litrosPorIbc: 1000,
  pctCombustibleOptiblue: 0.8,
  costoVariableFazonLitro: 0,
  iibbPct: 0,
  comisionPct: 0,
  sueldosAdmin: 10000000,
  sueldosProduccion: 0,
  litrosOptiblueIbc: 0,
  litrosIndustrial: 0,
  litrosFazon325: 0,
  litrosFazonIndustrial: 0,
};

const MAY_2026_PURCHASE_RULES: PurchaseRule[] = [
  { articulo: "UREA GRANULADA 46-0-0", proveedor: "IF Ingeniería en Fertilizantes S.A.", tipo: "MP", producto: "Industrial" },
  { articulo: "Urea Granulada en Big Bag (solucion)", proveedor: "Compañía de Negocios Agropecuarios CNA S.A.", tipo: "MP", producto: "Industrial" },
  { articulo: "Flete por ventas", proveedor: "Transporte Morala Claudio S.A.", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "PUBLICIDAD", proveedor: "AZAR MOTOR SPORTS S.A.", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Flete por ventas", proveedor: "Transporte RB", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "PUBLICIDAD", proveedor: "Alberti Pablo Alejandro", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Cheque rechazado", proveedor: "Construcciones Civil-Mecánica Arrecifes SRL", tipo: "RESULTADO_FINANCIERO", producto: "Financiero" },
  { articulo: "PUBLICIDAD", proveedor: "Trosset Nicolas", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "Macellari Juan de Dios", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Flete por ventas", proveedor: "Martinelli Brenda", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Flete por ventas", proveedor: "RAMIREZ RAMON", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Combustible camion", proveedor: "Gastecmor S.A.", tipo: "LOGISTICA_COMB", producto: "OptiBlue" },
  { articulo: "Servicio GAS", proveedor: "Buenos Aires Gas S.A.", tipo: "GAS", producto: "Industrial" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "Fontana Jorge Eduardo y Sicolone Gerardo Oscar", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "Manchot SRL", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "Ricardo Bartoli y Cía. S.A.", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "RAYFOC Ingeniería + Innovación de Arrecfes S.A.", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Insumos ferretería", proveedor: "Zanzottera Marcelo Oscar", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Diferencia de Cambio", proveedor: "Compañía de Negocios Agropecuarios CNA S.A.", tipo: "RESULTADO_FINANCIERO", producto: "Financiero" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "Del Valle José Jesús", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Comisionista", proveedor: "Rios Diego Rubén", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Comisionista", proveedor: "Gyselink Hugo Daniel", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Flete por ventas", proveedor: "FERTILIK S.A.", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Calcomanias 15cm x 15cm + laca", proveedor: "Gomez Juan María", tipo: "ETIQUETA_CONTROL", producto: "OptiBlue" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "Fabian A. Bethular y Luis P. Bethular", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Viaticos hotel", proveedor: "CRIADO RITA GRACIELA", tipo: "LOGISTICA", producto: "OptiBlue" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "P. Bouvier Maquinarias S.A.S.", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "MG Ballester SRL", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Calcomanias 23cm x 30cm + laca", proveedor: "Gomez Juan María", tipo: "ETIQUETA_CONTROL", producto: "OptiBlue" },
  { articulo: "Insumos electricidad", proveedor: "Electricidad Total S.A.", tipo: "FABRIL_ELECTRICIDAD", producto: "Planta" },
  { articulo: "Insumos laboratorio", proveedor: "INSTRUMENTAL PASTEUR SRL", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Insumos ferretería", proveedor: "Fontana Jorge Eduardo y Sicolone Gerardo Oscar", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Viaticos peaje", proveedor: "Grupo Concesionario del Oeste S.A.", tipo: "LOGISTICA", producto: "OptiBlue" },
  { articulo: "Impuestos internos", proveedor: "S.A. Importadora y Exportadora de la Patagonia", tipo: "IMPUESTOS", producto: "Empresa" },
  { articulo: "Viaticos peaje", proveedor: "Corredores Viales S.A.", tipo: "LOGISTICA", producto: "OptiBlue" },
  { articulo: "Impuestos internos", proveedor: "Cencosud S.A.", tipo: "IMPUESTOS", producto: "Empresa" },
  { articulo: "Viaticos peaje", proveedor: "Autopistas del Sol S.A.", tipo: "LOGISTICA", producto: "OptiBlue" },
  { articulo: "Ajuste por redondeo", proveedor: "Keh-Com SA", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Ajuste por redondeo", proveedor: "IF Ingeniería en Fertilizantes S.A.", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Ajuste por redondeo", proveedor: "Gastecmor S.A.", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Ajuste por redondeo", proveedor: "Servicentro Arrecifes S.R.L.", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Ajuste por redondeo", proveedor: "Marillet Oscar Luis", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Ajuste por redondeo", proveedor: "Buroni Comercial S.A.", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Ajuste por redondeo", proveedor: "Compañía de Negocios Agropecuarios CNA S.A.", tipo: "NO_COSTO", producto: "Empresa" },
  { articulo: "Diferencia de Cambio", proveedor: "IF Ingeniería en Fertilizantes S.A.", tipo: "RESULTADO_FINANCIERO", producto: "Financiero" },
  { articulo: "Solución de urea al 32.5% - LTS", proveedor: "IF Ingeniería en Fertilizantes S.A.", tipo: "MP", producto: "OptiBlue" },
  { articulo: "ASESORAMIENTO COMERCIAL", proveedor: "IF Ingeniería en Fertilizantes S.A.", tipo: "COMPENSACION_IF", producto: "IF Compensacion" },
  { articulo: "Construcción nave industrial 20x48", proveedor: "Construcciones Civil-Mecánica Arrecifes SRL", tipo: "INVERSION", producto: "Planta" },
  { articulo: "Combustibles varios", proveedor: "Operadora de Estaciones de Servicio S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Combustibles varios", proveedor: "Casares Combustibles S.R.L", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Mercaderia en general", proveedor: "Distribuciones Villa Sanguinetti Cuna de Campeones SA en formación", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Viandas", proveedor: "Distribuciones Villa Sanguinetti Cuna de Campeones SA en formación", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Analisis quimicos", proveedor: "SGS Argentina S.A.", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Fletes varios", proveedor: "Distribuciones Villa Sanguinetti Cuna de Campeones SA en formación", tipo: "FLETE", producto: "Industrial" },
  { articulo: "MUEBLES Y UTILES", proveedor: "Electrónica Megatone SRL", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Combustible vehiculos", proveedor: "Gastecmor S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Flete urea", proveedor: "MONTIVERO CRISTIAN ANDRES", tipo: "FLETE", producto: "Industrial" },
  { articulo: "Reparacion muebles y utiles", proveedor: "Sofluc S.A.", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Tambor x 200 lts.", proveedor: "Corigliano José Luis", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Combustible vehiculos", proveedor: "Keh-Com SA", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Combustible planta", proveedor: "Gastecmor S.A.", tipo: "FABRIL_ELECTRICIDAD", producto: "Planta" },
  { articulo: "Compras super", proveedor: "Buroni Comercial S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Compras super", proveedor: "S.A. Importadora y Exportadora de la Patagonia", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Poliza seguro automotor", proveedor: "Cooperación Mutual Patronal SMSG", tipo: "COSTO FIJO", producto: "Logistica" },
  { articulo: "Servicios web", proveedor: "E-Buyplace S.A.", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Servicio telefono", proveedor: "AMX Argentina S.A.", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Ropa de trabajo", proveedor: "Manufactura Arrecifes S.A.", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "Bobina zuncho 700mx19mm", proveedor: "Raypac SRL", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Combustibles varios", proveedor: "Keh-Com SA", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "INDUMENTARIA", proveedor: "Confecciones Arrecifes SRL", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "SERVICIO AREA PROTEGIDA", proveedor: "Millenium Arrecifes Salud S.R.L.", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "Combustible vehiculos", proveedor: "Operadora de Estaciones de Servicio S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "TERMINAL ZTECO M1", proveedor: "PRODUCTOS INTEGRA AZULA SRL", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Compras super", proveedor: "COTO Centro Integral de Comercialización S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Combustible vehiculos", proveedor: "Servicentro Arrecifes S.R.L.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Gastos libreria", proveedor: "Sucesión de Defferrarri Armando Luis", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Hebilla CB Zuncho - caja 6S x 500", proveedor: "Raypac SRL", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Compras super", proveedor: "Cencosud S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "TAPA TERMOSELLABLE", proveedor: "ARECOBLEA S.R.L.", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "TAPA BIDON", proveedor: "Marillet Oscar Luis", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Asesoramiento seguridad e higiene", proveedor: "Zuvilivia Santiago", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "ESMERILADO", proveedor: "Gomez Juan María", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Compras super", proveedor: "DISTRIBUIDORA ZONAL OLIVGURRE S.A.S.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "INDUMENTARIA", proveedor: "Alvarez Jorge L. y Norberto O. SH", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "Compras super", proveedor: "Día Argentina S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Servicio Internet", proveedor: "Coop. Elect. Integral de Prov. de Serv. Pub. y Soc. de Todd Ltda", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Pesada balanza municipal", proveedor: "A.P.R.A.", tipo: "LOGISTICA", producto: "Logistica" },
  { articulo: "Compras super", proveedor: "Productos Alimenticios S.A.", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Productos de Limpieza", proveedor: "Marillet Oscar Luis", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Mantenimiento extintores", proveedor: "García Carlos Alberto", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "Servicio telefono", proveedor: "Coop. Elect. Integral de Prov. de Serv. Pub. y Soc. de Todd Ltda", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Descuento recibido x pago en termino", proveedor: "Vigo Carlos A. y Bellfiore Nora M.", tipo: "RESULTADO_FINANCIERO", producto: "Financiero" },
];

const PURCHASE_RULES: PurchaseRule[] = [
  ...MAY_2026_PURCHASE_RULES,
  { articulo: "UREA GRANULADA 46-0-0", proveedor: "IF Ingenieria en Fertilizantes S.A.", tipo: "MP", producto: "Industrial" },
  { articulo: "Flete por ventas", proveedor: "*", tipo: "GASTO_COMERCIAL", producto: "Comercial" },
  { articulo: "Flete", proveedor: "*", tipo: "FLETE", producto: "Industrial" },
  { articulo: "Combustible camion", proveedor: "*", tipo: "LOGISTICA_COMB", producto: "OptiBlue" },
  { articulo: "Viaticos peaje", proveedor: "*", tipo: "LOGISTICA", producto: "OptiBlue" },
  { articulo: "VIATICOS Y SERVICIOS", proveedor: "*", tipo: "LOGISTICA", producto: "OptiBlue" },
  { articulo: "Servicio GAS", proveedor: "*", tipo: "GAS", producto: "Industrial" },
  { articulo: "gas", proveedor: "*", tipo: "GAS", producto: "Industrial" },
  { articulo: "Combustible vehiculos", proveedor: "*", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Servicio Internet", proveedor: "*", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Servicio telefono", proveedor: "*", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Honorarios profesionales", proveedor: "*", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Gastos libreria", proveedor: "*", tipo: "ADMIN", producto: "Administracion" },
  { articulo: "Compras super", proveedor: "*", tipo: "ADMIN VARIOS", producto: "Administracion" },
  { articulo: "Impuestos internos", proveedor: "*", tipo: "IMPUESTOS", producto: "Empresa" },
  { articulo: "PUBLICIDAD", proveedor: "*", tipo: "ADMIN IVA", producto: "Comercial" },
  { articulo: "Servicios web", proveedor: "*", tipo: "ADMIN", producto: "Comercial" },
  { articulo: "Servicio diseno grafico", proveedor: "*", tipo: "ADMIN", producto: "Comercial" },
  { articulo: "Servicio Energia electrica", proveedor: "*", tipo: "FABRIL_ELECTRICIDAD", producto: "Planta" },
  { articulo: "Insumos electricidad", proveedor: "*", tipo: "FABRIL_ELECTRICIDAD", producto: "Planta" },
  { articulo: "Combustible planta", proveedor: "*", tipo: "FABRIL_ELECTRICIDAD", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento maquinaria", proveedor: "*", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento galpon", proveedor: "*", tipo: "FABRIL_MANTENIMIENTO", producto: "Planta" },
  { articulo: "Insumos laboratorio", proveedor: "*", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Productos de Limpieza", proveedor: "*", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "Insumos ferreteria", proveedor: "*", tipo: "FABRIL_INSUMOS", producto: "Planta" },
  { articulo: "SERVICIO AREA PROTEGIDA", proveedor: "*", tipo: "FABRIL_SEGURIDAD", producto: "Planta" },
  { articulo: "Reparacion y mantenimiento camion", proveedor: "*", tipo: "COSTO FIJO", producto: "Logistica" },
  { articulo: "Instalacion maquinaria", proveedor: "*", tipo: "INVERSION", producto: "Planta" },
  { articulo: "Instalacion mejoras", proveedor: "*", tipo: "INVERSION", producto: "Planta" },
  { articulo: "OBRA", proveedor: "*", tipo: "INVERSION", producto: "Planta" },
  { articulo: "Construccion nave industrial 20x48", proveedor: "*", tipo: "INVERSION", producto: "Planta" },
  { articulo: "Bidon 10L", proveedor: "*", tipo: "ENVASE_CONTROL", producto: "OptiBlue" },
  { articulo: "Bidon 20L", proveedor: "*", tipo: "ENVASE_CONTROL", producto: "OptiBlue" },
  { articulo: "IBC x 1m3 c/u - nuevo", proveedor: "*", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "IBC X 1m3 c/u - Nuevo", proveedor: "*", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Tambor x 200 lts.", proveedor: "*", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Tarima de madera", proveedor: "*", tipo: "ACCESORIO_COMPRA", producto: "Envases" },
  { articulo: "Calcomanias 15cm x 15cm + laca", proveedor: "*", tipo: "ETIQUETA_CONTROL", producto: "OptiBlue" },
  { articulo: "Calcomanias 23cm x 30cm + laca", proveedor: "*", tipo: "ETIQUETA_CONTROL", producto: "OptiBlue" },
  { articulo: "Tapa Botella PET muestras 500cc", proveedor: "*", tipo: "INSUMO_CONTROL", producto: "Control" },
  { articulo: "Botella PET muestras 500cc", proveedor: "*", tipo: "INSUMO_CONTROL", producto: "Control" },
  { articulo: "Precinto alpine amarillo/verde x1000 u.", proveedor: "*", tipo: "INSUMO_CONTROL", producto: "Control" },
  { articulo: "Diferencia de Cambio", proveedor: "*", tipo: "RESULTADO_FINANCIERO", producto: "Financiero" },
  { articulo: "Ajuste tipo de cambio", proveedor: "*", tipo: "RESULTADO_FINANCIERO", producto: "Financiero" },
];

const MAY_2026_SALES_RULES: SalesRule[] = [
  { articulo: "100231 Solución UREA INDUSTRIAL Granel", tipo: "PRODUCTO", producto: "INDUSTRIAL", generaLitros: true, factor: 1 },
  { articulo: "100126 Servicio de almacenaje, fraccionamiento y dilución", tipo: "SERVICIO", producto: "IF_FAZON_325", generaLitros: true, factor: 0 },
  { articulo: "100383 OPTI-N20 Solución Urea Industrial", tipo: "PRODUCTO", producto: "INDUSTRIAL", generaLitros: true, factor: 1 },
  { articulo: "100134 OPTI-BLUE 32 - Urea líquida 32.5%", tipo: "PRODUCTO", producto: "OPTIBLUE_IBC", generaLitros: true, factor: 1 },
  { articulo: "100135 OPTI-BLUE 32 - Solución de urea al 32.5%", tipo: "PRODUCTO", producto: "OPTIBLUE_IBC", generaLitros: true, factor: 1 },
  { articulo: "100225 Solución de urea al 32.5% - LTS", tipo: "PRODUCTO", producto: "OPTIBLUE_IBC", generaLitros: true, factor: 1 },
  { articulo: "100105 IBC x 1m³ c/u - nuevo", tipo: "ACCESORIO", producto: "IBC", generaLitros: false, factor: 0 },
  { articulo: "100250 IBC X 1m³ c/u - Nuevo", tipo: "ACCESORIO", producto: "IBC", generaLitros: false, factor: 0 },
  { articulo: "100202 OPTI-BLUE - Solución de urea al 32,5% - bidón 20L", tipo: "PRODUCTO", producto: "OPTIBLUE_20", generaLitros: true, factor: 20 },
  { articulo: "100127 Servicio de planta", tipo: "SERVICIO", producto: "IF_FAZON_IND", generaLitros: true, factor: 0 },
  { articulo: "100201 OPTI-BLUE - Solución de urea al 32,5% - bidón 10L", tipo: "PRODUCTO", producto: "OPTIBLUE_10", generaLitros: true, factor: 10 },
  { articulo: "100122 Tarima de madera", tipo: "ACCESORIO", producto: "TARIMA", generaLitros: false, factor: 0 },
  { articulo: "100359 OPTI-PURE - Agua Bidesmineralizada Grado I - Bidón x 5 lts.", tipo: "PRODUCTO", producto: "OPTIPURE_BIDON", generaLitros: true, factor: 5 },
  { articulo: "100103 Bidón x 20 litros", tipo: "ACCESORIO", producto: "ENVASES", generaLitros: false, factor: 0 },
];

const SALES_RULES: SalesRule[] = [
  ...MAY_2026_SALES_RULES,
  { articulo: "100134 OPTI-BLUE 32 - Urea liquida 32.5%", tipo: "PRODUCTO", producto: "OPTIBLUE_IBC", generaLitros: true, factor: 1 },
  { articulo: "100135 OPTI-BLUE 32 - Solucion de urea al 32.5%", tipo: "PRODUCTO", producto: "OPTIBLUE_IBC", generaLitros: true, factor: 1 },
  { articulo: "100201 OPTI-BLUE - Solucion de urea al 32,5% - bidon 10L", tipo: "PRODUCTO", producto: "OPTIBLUE_10", generaLitros: true, factor: 10 },
  { articulo: "100202 OPTI-BLUE - Solucion de urea al 32,5% - bidon 20L", tipo: "PRODUCTO", producto: "OPTIBLUE_20", generaLitros: true, factor: 20 },
  { articulo: "100231 Solucion UREA INDUSTRIAL Granel", tipo: "PRODUCTO", producto: "INDUSTRIAL", generaLitros: true, factor: 1 },
  { articulo: "100126 Servicio de almacenaje, fraccionamiento y dilucion", tipo: "SERVICIO", producto: "IF_FAZON_325", generaLitros: true, factor: 0 },
  { articulo: "100127 Servicio de planta", tipo: "SERVICIO", producto: "IF_FAZON_IND", generaLitros: true, factor: 0 },
  { articulo: "100348 OPTI-PURE - Agua Bidesmineralizada Grado I", tipo: "PRODUCTO", producto: "OPTIPURE_GRANEL", generaLitros: true, factor: 1 },
  { articulo: "100359 OPTI-PURE - Agua Bidesmineralizada Grado I - Bidon x 5 lts.", tipo: "PRODUCTO", producto: "OPTIPURE_BIDON", generaLitros: true, factor: 5 },
  { articulo: "100105 IBC x 1m3 c/u - nuevo", tipo: "ACCESORIO", producto: "IBC", generaLitros: false, factor: 0 },
  { articulo: "100250 IBC X 1m3 c/u - Nuevo", tipo: "ACCESORIO", producto: "IBC", generaLitros: false, factor: 0 },
  { articulo: "100122 Tarima de madera", tipo: "ACCESORIO", producto: "TARIMA", generaLitros: false, factor: 0 },
  { articulo: "100133 Tambor x 200 lts.", tipo: "ACCESORIO", producto: "TAMBOR", generaLitros: false, factor: 0 },
  { articulo: "100129 Cheque rechazado", tipo: "OTROS", producto: "OTROS", generaLitros: false, factor: 0 },
  { articulo: "56 Gastos e Impuestos bancarios", tipo: "OTROS", producto: "OTROS", generaLitros: false, factor: 0 },
];

const PRODUCT_ORDER = [
  "OPTIBLUE_10",
  "OPTIBLUE_20",
  "OPTIBLUE_IBC",
  "INDUSTRIAL",
  "IF_FAZON_325",
  "IF_FAZON_IND",
  "OPTIPURE_GRANEL",
  "OPTIPURE_BIDON",
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

function purchaseTypeName(tipo: string) {
  return PURCHASE_TYPE_DETAILS[tipo]?.label ?? tipo;
}

function purchaseTypeOptionLabel(tipo: string) {
  const detail = PURCHASE_TYPE_DETAILS[tipo];
  return detail ? `${tipo} - ${detail.label}` : tipo;
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
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function rowsFromSheet(workbook: XLSX.WorkBook | null, sheetName: string): RawRow[] {
  const sheet = workbook?.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function base64ToArrayBuffer(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function parseStoredWorkbook(payload: string | null) {
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

async function fetchCostConfiguration() {
  if (COSTS_CONFIG_MODE === "local") {
    throw new Error("Configuracion en modo local.");
  }

  const response = await fetch(`${API_BASE_URL}/costs/configuration`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo leer configuracion de costos.");
  return (await response.json()) as CostConfigurationPayload;
}

async function persistCostConfiguration(payload: CostConfigurationPayload) {
  if (COSTS_CONFIG_MODE === "local") return;

  const response = await fetch(`${API_BASE_URL}/costs/configuration`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      params: payload.params ?? DEFAULT_PARAMS,
      purchaseRules: payload.purchaseRules,
      salesRules: payload.salesRules,
    }),
  });
  if (!response.ok) throw new Error("No se pudo guardar configuracion de costos.");
}

function isDateLike(value: unknown) {
  return value instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(text(value));
}

function groupedPurchaseRowsFromSheet(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: false,
    defval: "",
    header: 1,
  });
  const title = key(rows[0]?.[1]);
  const header = key(rows[2]?.[1]);
  if (!title.includes("DETALLE DE COMPRAS POR PROVEEDOR") || header !== "ARTICULO") return [];

  let proveedor = "";
  let fecha = "";
  const purchases: RawRow[] = [];

  rows.forEach((row, index) => {
    if (index < 3) return;

    const articulo = text(row[1]);
    const comprobante = text(row[7]);
    const cantidad = num(row[9]);
    const unidad = text(row[10]);

    if (!articulo && isDateLike(row[2])) {
      fecha = text(row[2]);
      return;
    }

    const isProviderRow =
      articulo &&
      !comprobante &&
      !cantidad &&
      !unidad &&
      !["SUBTOTAL", "TOTAL", "IMPRESO:", "ARTICULO"].includes(key(articulo));

    if (isProviderRow) {
      proveedor = articulo;
      return;
    }

    if (!articulo || !comprobante) return;

    purchases.push({
      Fecha: fecha,
      Comprobante: comprobante,
      Articulo_ERP: articulo,
      Proveedor: proveedor,
      Cantidad: cantidad,
      Unidad: unidad,
      Precio_Unit_Neto: num(row[11]),
      Total_Neto: num(row[17]),
      Total_Final: num(row[18]),
      Comprador: text(row[6]),
    });
  });

  return purchases;
}

function groupedSalesRowsFromSheet(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    blankrows: false,
    defval: "",
    header: 1,
  });
  const titleFound = rows
    .slice(0, 8)
    .some((row) =>
      row.some((cell) => {
        const value = key(cell);
        return value.includes("DETALLE DE VENTAS") && value.includes("ARTICULO");
      }),
    );
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => key(cell) === "COMPROBANTE"),
  );
  if (!titleFound && headerIndex < 0) return [];

  const headerRow = rows[headerIndex] ?? [];
  const comprobanteColumn = headerRow.findIndex((cell) => key(cell) === "COMPROBANTE");
  if (comprobanteColumn < 0) return [];

  const articleColumn = Math.max(comprobanteColumn - 1, 0);
  const clienteColumn = headerRow.findIndex((cell) => key(cell) === "CLIENTE");
  const cantidadColumn = headerRow.findIndex((cell) => key(cell) === "CANTIDAD");
  const unidadColumn = headerRow.findIndex((cell) => key(cell) === "UNIDAD");
  const precioColumn = headerRow.findIndex((cell) => key(cell).includes("PRECIO") && key(cell).includes("UNIT"));
  const totalNetoColumn = headerRow.findIndex((cell) => key(cell).includes("TOTAL") && key(cell).includes("NETO"));
  const totalFinalColumn = headerRow.findIndex((cell) => key(cell).includes("TOTAL") && key(cell).includes("FINAL"));
  const pendienteColumn = headerRow.findIndex((cell) => key(cell).includes("PENDIENTE"));

  let articulo = "";
  const sales: RawRow[] = [];

  rows.forEach((row, index) => {
    if (index <= headerIndex) return;

    const maybeArticle = text(row[articleColumn]);
    const comprobante = text(row[comprobanteColumn]);
    const cliente = clienteColumn >= 0 ? text(row[clienteColumn]) : text(row[comprobanteColumn + 3]);
    const cantidad = cantidadColumn >= 0 ? num(row[cantidadColumn]) : num(row[comprobanteColumn + 5]);

    const isArticleRow =
      maybeArticle &&
      !comprobante &&
      !cliente &&
      !cantidad &&
      !["SUBTOTAL", "TOTAL", "IMPRESO:", "COMPROBANTE"].includes(key(maybeArticle));

    if (isArticleRow) {
      articulo = maybeArticle;
      return;
    }

    if (!articulo || !comprobante) return;

    sales.push({
      Articulo_ERP: articulo,
      Cliente: cliente,
      Comprobante: comprobante,
      Cantidad: cantidad,
      Unidad: unidadColumn >= 0 ? text(row[unidadColumn]) : text(row[comprobanteColumn + 6]),
      Precio_Unit_Neto: precioColumn >= 0 ? num(row[precioColumn]) : num(row[comprobanteColumn + 7]),
      Total_Neto: totalNetoColumn >= 0 ? num(row[totalNetoColumn]) : num(row[comprobanteColumn + 13]),
      Total_Final: totalFinalColumn >= 0 ? num(row[totalFinalColumn]) : num(row[comprobanteColumn + 14]),
      Pendiente: pendienteColumn >= 0 ? num(row[pendienteColumn]) : num(row[comprobanteColumn + 16]),
    });
  });

  return sales;
}

function purchaseRowsFromWorkbook(workbook: XLSX.WorkBook | null): RawRow[] {
  const standard = rowsFromSheet(workbook, "COMPRAS_RAW");
  if (standard.length || !workbook) return standard;

  for (const sheetName of workbook.SheetNames) {
    const grouped = groupedPurchaseRowsFromSheet(workbook, sheetName);
    if (grouped.length) return grouped;
  }

  return [];
}

function salesRowsFromWorkbook(workbook: XLSX.WorkBook | null): RawRow[] {
  const standard = rowsFromSheet(workbook, "VENTAS_RAW");
  if (standard.length || !workbook) return standard;

  for (const sheetName of workbook.SheetNames) {
    const grouped = groupedSalesRowsFromSheet(workbook, sheetName);
    if (grouped.length) return grouped;
  }

  return [];
}

function productionMap(params: CostParams) {
  return new Map<string, number>([
    ["OPTIBLUE_IBC", params.litrosOptiblueIbc],
    ["INDUSTRIAL", params.litrosIndustrial],
    ["IF_FAZON_325", params.litrosFazon325],
    ["IF_FAZON_IND", params.litrosFazonIndustrial],
  ]);
}

function purchaseLookup(rules: PurchaseRule[]) {
  const exact = new Map<string, { tipo: string; producto: string }>();
  const wildcard = new Map<string, { tipo: string; producto: string }>();

  rules.forEach((rule) => {
    const item = { tipo: rule.tipo, producto: rule.producto };
    if (rule.proveedor === "*") wildcard.set(key(rule.articulo), item);
    else exact.set(`${key(rule.articulo)}|${key(rule.proveedor)}`, item);
  });

  return (articulo: string, proveedor: string) =>
    exact.get(`${key(articulo)}|${key(proveedor)}`) ??
    wildcard.get(key(articulo)) ?? { tipo: "REVISAR", producto: "REVISAR" };
}

function salesLookup(rules: SalesRule[]) {
  const map = new Map(rules.map((rule) => [key(rule.articulo), rule]));
  return (articulo: string) =>
    map.get(key(articulo)) ?? {
      tipo: "REVISAR",
      producto: "REVISAR",
      generaLitros: false,
      factor: 0,
    };
}

function sum<T>(rows: T[], predicate: (row: T) => boolean, selector: (row: T) => number) {
  return rows.reduce((total, row) => (predicate(row) ? total + selector(row) : total), 0);
}

function weightedUnitCost(
  purchases: PurchaseRow[],
  matcher: (row: PurchaseRow) => boolean,
  fallback: number,
  normalizeQuantity: (row: PurchaseRow) => number = (row) => row.cantidad,
) {
  const totals = purchases
    .filter(matcher)
    .reduce(
      (acc, row) => {
        acc.total += row.total;
        acc.quantity += normalizeQuantity(row);
        return acc;
      },
      { total: 0, quantity: 0 },
    );

  return totals.quantity > 0 ? totals.total / totals.quantity : fallback;
}

function buildCostModel(
  purchasesWorkbook: XLSX.WorkBook | null,
  salesWorkbook: XLSX.WorkBook | null,
  params: CostParams,
  purchaseRules: PurchaseRule[],
  salesRules: SalesRule[],
): CostModel | null {
  const purchaseRows = purchaseRowsFromWorkbook(purchasesWorkbook);
  const saleRows = salesRowsFromWorkbook(salesWorkbook);
  if (!purchaseRows.length && !saleRows.length) return null;

  const classifyPurchase = purchaseLookup(purchaseRules);
  const classifySale = salesLookup(salesRules);
  const production = productionMap(params);

  const purchases = purchaseRows
    .map((row) => {
      const articulo = text(row.Articulo_ERP);
      const proveedor = text(row.Proveedor);
      const classified = classifyPurchase(articulo, proveedor);
      return {
        comprobante: text(row.Comprobante),
        articulo,
        proveedor,
        cantidad: num(row.Cantidad),
        precioUnitario: num(row.Precio_Unit_Neto),
        total: num(row.Total_Neto),
        tipo: classified.tipo,
        producto: classified.producto,
      };
    })
    .filter((row) => row.articulo || row.proveedor || row.total);

  const sales = saleRows
    .map((row) => {
      const articulo = text(row.Articulo_ERP);
      const classified = classifySale(articulo);
      const cantidad = num(row.Cantidad);
      const fallbackLitros = production.get(classified.producto) ?? 0;
      const litros = classified.generaLitros
        ? classified.factor > 0
          ? cantidad * classified.factor
          : fallbackLitros
        : 0;

      return {
        articulo,
        comprobante: text(row.Comprobante),
        cliente: text(row.Cliente),
        cantidad,
        total: num(row.Total_Neto),
        tipo: classified.tipo,
        producto: classified.producto,
        litros,
        revisar: classified.tipo === "REVISAR" || classified.producto === "REVISAR",
      };
    })
    .filter((row) => row.articulo || row.cliente || row.total);

  const purchaseTotal = (tipo: string, producto?: string) =>
    sum(
      purchases,
      (row) => row.tipo === tipo && (!producto || row.producto === producto),
      (row) => row.total,
    );

  const plantLiters =
    Array.from(production.values()).reduce((total, value) => total + value, 0) ||
    sum(sales, (row) => row.litros > 0, (row) => row.litros);
  const industrialLitersFromParams =
    (production.get("INDUSTRIAL") ?? 0) +
    (production.get("IF_FAZON_IND") ?? 0);
  const industrialLitersFromSales = sum(
    sales,
    (row) => row.producto === "INDUSTRIAL" || row.producto === "IF_FAZON_IND",
    (row) => row.litros,
  );
  const industrialLiters = industrialLitersFromParams || industrialLitersFromSales;
  const optiblueSalesLiters = sum(
    sales,
    (row) => row.producto.startsWith("OPTIBLUE"),
    (row) => row.litros,
  );

  const combustibleImputado =
    purchaseTotal("LOGISTICA_COMB") * params.pctCombustibleOptiblue;
  const logisticaOptiblueTotal =
    combustibleImputado + purchaseTotal("LOGISTICA", "OptiBlue");
  const logisticaOptiblueLitro = optiblueSalesLiters
    ? logisticaOptiblueTotal / optiblueSalesLiters
    : 0;
  const fleteOptiblueLitro = optiblueSalesLiters
    ? purchaseTotal("FLETE", "OptiBlue") / optiblueSalesLiters
    : 0;
  const fleteIndustrialLitro = params.litrosIndustrial
    ? purchaseTotal("FLETE", "Industrial") / params.litrosIndustrial
    : 0;
  const gasIndustrialLitro = industrialLiters
    ? purchaseTotal("GAS", "Industrial") / industrialLiters
    : 0;

  const costoFabrilTotal =
    params.sueldosProduccion +
    purchaseTotal("FABRIL_ELECTRICIDAD") +
    purchaseTotal("FABRIL_MANTENIMIENTO") +
    purchaseTotal("FABRIL_INSUMOS") +
    purchaseTotal("FABRIL_SEGURIDAD") +
    purchaseTotal("COSTO FABRIL");
  const costoFabrilLitro = plantLiters ? costoFabrilTotal / plantLiters : 0;

  const ureaIndustrialCantidad = sum(
    purchases,
    (row) => row.tipo === "MP" && key(row.articulo) === key("UREA GRANULADA 46-0-0"),
    (row) => row.cantidad,
  );
  const ureaIndustrialTotal = sum(
    purchases,
    (row) => row.tipo === "MP" && key(row.articulo) === key("UREA GRANULADA 46-0-0"),
    (row) => row.total,
  );
  const fleteMpIndustrialTotal = purchaseTotal("MP_FLETE", "Industrial");
  const fleteMpOptiblueLitro = optiblueSalesLiters
    ? purchaseTotal("MP_FLETE", "OptiBlue") / optiblueSalesLiters
    : 0;

  const mpOptiblue =
    params.densidadOptiblue *
    params.concentracionOptiblue *
    (params.costoUreaOptiblueTon / 1000) +
    fleteMpOptiblueLitro;
  const mpIndustrial =
    ureaIndustrialCantidad > 0
      ? params.densidadIndustrial *
        params.concentracionIndustrial *
        ((ureaIndustrialTotal + fleteMpIndustrialTotal) / (ureaIndustrialCantidad * 1000))
      : 0;

  const costoBotellaMuestra = weightedUnitCost(
    purchases,
    (row) => key(row.articulo).includes("BOTELLA PET MUESTRAS"),
    params.costoBotellaMuestra,
  );
  const costoTapaMuestra = weightedUnitCost(
    purchases,
    (row) => key(row.articulo).includes("TAPA BOTELLA PET MUESTRAS"),
    params.costoTapaMuestra,
  );
  const costoPrecinto = weightedUnitCost(
    purchases,
    (row) => key(row.articulo).includes("PRECINTO"),
    params.costoPrecinto,
    (row) => {
      const looksLikePack =
        key(row.articulo).includes("X1000") &&
        row.cantidad <= 20 &&
        row.precioUnitario > 1000;
      return looksLikePack ? row.cantidad * 1000 : row.cantidad;
    },
  );
  const comprobantesConMuestra = new Set(
    sales
      .filter((row) => row.tipo === "PRODUCTO" || row.tipo === "SERVICIO")
      .map((row) => row.comprobante)
      .filter(Boolean),
  ).size;
  const muestraTotal =
    comprobantesConMuestra *
    params.consumoMuestrasPorComprobante *
    (costoBotellaMuestra + costoTapaMuestra);
  const muestrasPorLitro = plantLiters ? muestraTotal / plantLiters : 0;
  const optiblueIbcLitros = sum(
    sales,
    (row) => row.producto === "OPTIBLUE_IBC" || row.producto === "IF_FAZON_325",
    (row) => row.litros,
  );
  const ibcConPrecinto = params.litrosPorIbc > 0 ? optiblueIbcLitros / params.litrosPorIbc : 0;
  const precintoTotal = ibcConPrecinto * params.consumoPrecintosPorIbc * costoPrecinto;
  const precintosPorLitro = optiblueIbcLitros ? precintoTotal / optiblueIbcLitros : 0;

  const priceByProduct = new Map<string, { litros: number; facturacion: number }>();
  sales.forEach((row) => {
    if (!row.litros || row.revisar) return;
    const current = priceByProduct.get(row.producto) ?? { litros: 0, facturacion: 0 };
    current.litros += row.litros;
    current.facturacion += row.total;
    priceByProduct.set(row.producto, current);
  });

  const costByProduct = (producto: string, precioLitro: number) => {
    const iibb = precioLitro * params.iibbPct;
    const comision = precioLitro * params.comisionPct;

    if (producto === "OPTIBLUE_10") {
      return mpOptiblue + params.costoBidon10 / 10 + params.costoEtiqueta15 / 10 + fleteOptiblueLitro + logisticaOptiblueLitro + muestrasPorLitro + iibb + comision;
    }
    if (producto === "OPTIBLUE_20") {
      return mpOptiblue + params.costoBidon20 / 20 + params.costoEtiqueta15 / 20 + fleteOptiblueLitro + logisticaOptiblueLitro + muestrasPorLitro + iibb + comision;
    }
    if (producto === "OPTIBLUE_IBC") {
      return mpOptiblue + params.costoEtiqueta23 / 1000 + fleteOptiblueLitro + logisticaOptiblueLitro + muestrasPorLitro + precintosPorLitro + iibb + comision;
    }
    if (producto === "INDUSTRIAL") {
      return mpIndustrial + fleteIndustrialLitro + gasIndustrialLitro + muestrasPorLitro + iibb + comision;
    }
    if (producto === "IF_FAZON_325") {
      return params.costoVariableFazonLitro + muestrasPorLitro + precintosPorLitro + iibb + comision;
    }
    if (producto === "IF_FAZON_IND") {
      return gasIndustrialLitro + params.costoVariableFazonLitro + muestrasPorLitro + iibb + comision;
    }
    if (producto === "OPTIPURE_GRANEL") {
      return params.costoOptipureGranelLitro + muestrasPorLitro + iibb + comision;
    }
    if (producto === "OPTIPURE_BIDON") {
      return params.costoOptipureGranelLitro + params.costoBidonOptipure / 5 + params.costoEtiquetaOptipure / 5 + muestrasPorLitro + iibb + comision;
    }
    return iibb + comision;
  };

  const products = PRODUCT_ORDER.map((producto) => {
    const sale = priceByProduct.get(producto) ?? {
      litros: production.get(producto) ?? 0,
      facturacion: 0,
    };
    const precioLitro = sale.litros ? sale.facturacion / sale.litros : 0;
    const costoLitro = costByProduct(producto, precioLitro);
    const margenLitro = precioLitro - costoLitro;
    return {
      producto,
      litros: sale.litros,
      facturacion: sale.facturacion,
      precioLitro,
      costoLitro,
      margenLitro,
      margenTotal: margenLitro * sale.litros,
    };
  });

  const litrosTotales = products.reduce((total, row) => total + row.litros, 0);
  const facturacionAnalizada = products.reduce((total, row) => total + row.facturacion, 0);
  const facturacionTotal = sales.reduce((total, row) => total + row.total, 0);
  const resultadoIndustrial = products.reduce((total, row) => total + row.margenTotal, 0);
  const gastosAdmin =
    params.sueldosAdmin +
    purchaseTotal("ADMIN") +
    purchaseTotal("ADMIN VARIOS") +
    purchaseTotal("ADMIN IVA") +
    purchaseTotal("IMPUESTOS");
  const gastosComerciales = purchaseTotal("GASTO_COMERCIAL");
  const costosFijos = purchaseTotal("COSTO FIJO");
  const resultadoCore = resultadoIndustrial - gastosAdmin - gastosComerciales - costosFijos;
  const margenEquilibrioLitro = litrosTotales ? resultadoIndustrial / litrosTotales : 0;
  const puntoEquilibrioLitros =
    margenEquilibrioLitro > 0
      ? (gastosAdmin + gastosComerciales + costosFijos) / margenEquilibrioLitro
      : 0;
  const indirectosGestionLitro = litrosTotales
    ? (gastosAdmin + gastosComerciales + costosFijos) / litrosTotales
    : 0;

  const productCostComponents = (row: ProductResult) => {
    const iibb = row.precioLitro * params.iibbPct;
    const comision = row.precioLitro * params.comisionPct;
    const shared = [
      { label: "Muestras y control", value: muestrasPorLitro, controllability: "media" as const },
      { label: "IIBB y comision", value: iibb + comision, controllability: "baja" as const },
      { label: "Indirectos gestion", value: indirectosGestionLitro, controllability: "media" as const },
    ];

    if (row.producto === "OPTIBLUE_10") {
      return [
        { label: "Materia prima", value: mpOptiblue, controllability: "media" as const },
        { label: "Bidon 10L", value: params.costoBidon10 / 10, controllability: "alta" as const },
        { label: "Etiqueta", value: params.costoEtiqueta15 / 10, controllability: "alta" as const },
        { label: "Flete", value: fleteOptiblueLitro, controllability: "media" as const },
        { label: "Logistica", value: logisticaOptiblueLitro, controllability: "alta" as const },
        { label: "Costo fabril", value: costoFabrilLitro, controllability: "media" as const },
        ...shared,
      ];
    }
    if (row.producto === "OPTIBLUE_20") {
      return [
        { label: "Materia prima", value: mpOptiblue, controllability: "media" as const },
        { label: "Bidon 20L", value: params.costoBidon20 / 20, controllability: "alta" as const },
        { label: "Etiqueta", value: params.costoEtiqueta15 / 20, controllability: "alta" as const },
        { label: "Flete", value: fleteOptiblueLitro, controllability: "media" as const },
        { label: "Logistica", value: logisticaOptiblueLitro, controllability: "alta" as const },
        { label: "Costo fabril", value: costoFabrilLitro, controllability: "media" as const },
        ...shared,
      ];
    }
    if (row.producto === "OPTIBLUE_IBC") {
      return [
        { label: "Materia prima", value: mpOptiblue, controllability: "media" as const },
        { label: "Etiqueta IBC", value: params.costoEtiqueta23 / 1000, controllability: "alta" as const },
        { label: "Flete", value: fleteOptiblueLitro, controllability: "media" as const },
        { label: "Logistica", value: logisticaOptiblueLitro, controllability: "alta" as const },
        { label: "Precintos", value: precintosPorLitro, controllability: "alta" as const },
        { label: "Costo fabril", value: costoFabrilLitro, controllability: "media" as const },
        ...shared,
      ];
    }
    if (row.producto === "INDUSTRIAL") {
      return [
        { label: "Materia prima", value: mpIndustrial, controllability: "media" as const },
        { label: "Flete", value: fleteIndustrialLitro, controllability: "media" as const },
        { label: "Gas", value: gasIndustrialLitro, controllability: "media" as const },
        { label: "Costo fabril", value: costoFabrilLitro, controllability: "media" as const },
        ...shared,
      ];
    }
    if (row.producto === "IF_FAZON_325") {
      return [
        { label: "Variable fazon", value: params.costoVariableFazonLitro, controllability: "media" as const },
        { label: "Precintos", value: precintosPorLitro, controllability: "alta" as const },
        ...shared,
      ];
    }
    if (row.producto === "IF_FAZON_IND") {
      return [
        { label: "Gas", value: gasIndustrialLitro, controllability: "media" as const },
        { label: "Variable fazon", value: params.costoVariableFazonLitro, controllability: "media" as const },
        ...shared,
      ];
    }
    if (row.producto === "OPTIPURE_GRANEL") {
      return [
        { label: "OptiPure granel", value: params.costoOptipureGranelLitro, controllability: "media" as const },
        ...shared,
      ];
    }
    if (row.producto === "OPTIPURE_BIDON") {
      return [
        { label: "OptiPure granel", value: params.costoOptipureGranelLitro, controllability: "media" as const },
        { label: "Bidon OptiPure", value: params.costoBidonOptipure / 5, controllability: "alta" as const },
        { label: "Etiqueta OptiPure", value: params.costoEtiquetaOptipure / 5, controllability: "alta" as const },
        ...shared,
      ];
    }
    return shared;
  };

  const costDrivers = products.map((row) => {
    const rawDrivers = productCostComponents(row).filter((driver) => driver.value > 0);
    const total = rawDrivers.reduce((acc, driver) => acc + driver.value, 0);
    const drivers = rawDrivers
      .map((driver) => ({
        ...driver,
        share: total ? driver.value / total : 0,
        reductionImpact: driver.controllability === "baja" ? 0 : driver.value * 0.1,
      }))
      .sort((a, b) => b.value - a.value);
    const reducibleTotal = drivers.reduce((acc, driver) => acc + driver.reductionImpact, 0);
    const topDriver = drivers[0] ?? null;
    const bestLever = drivers
      .filter((driver) => driver.reductionImpact > 0)
      .sort((a, b) => b.reductionImpact - a.reductionImpact)[0];

    return {
      producto: row.producto,
      litros: row.litros,
      precioLitro: row.precioLitro,
      costoLitro: row.costoLitro,
      costoGestionLitro: total,
      margenGestionLitro: row.precioLitro - total,
      drivers,
      topDriver,
      reducibleTotal,
      opportunity: bestLever
        ? `Reducir 10% ${bestLever.label.toLowerCase()} mejora el margen aprox. ${money(bestLever.reductionImpact)} por litro.`
        : "Sin palancas claras hasta cargar mas datos de costos.",
    };
  });

  const activeCostDrivers = costDrivers.filter(
    (product) => product.litros > 0 || product.costoGestionLitro > 0,
  );
  const leverMap = new Map<
    string,
    {
      label: string;
      value: number;
      reductionImpact: number;
      controllability: "alta" | "media" | "baja";
      affectedProducts: Set<string>;
    }
  >();
  const weightedCostBase = activeCostDrivers.reduce(
    (total, product) => total + product.costoGestionLitro * Math.max(product.litros, 1),
    0,
  );

  activeCostDrivers.forEach((product) => {
    const weight = Math.max(product.litros, 1);
    product.drivers.forEach((driver) => {
      const current =
        leverMap.get(driver.label) ??
        {
          label: driver.label,
          value: 0,
          reductionImpact: 0,
          controllability: driver.controllability,
          affectedProducts: new Set<string>(),
        };
      current.value += driver.value * weight;
      current.reductionImpact += driver.reductionImpact * weight;
      current.affectedProducts.add(product.producto);
      if (current.controllability !== "alta" && driver.controllability === "alta") {
        current.controllability = "alta";
      } else if (current.controllability === "baja" && driver.controllability === "media") {
        current.controllability = "media";
      }
      leverMap.set(driver.label, current);
    });
  });

  const topLevers = Array.from(leverMap.values())
    .map((lever) => ({
      label: lever.label,
      value: lever.value,
      share: weightedCostBase ? lever.value / weightedCostBase : 0,
      reductionImpact: lever.reductionImpact,
      controllability: lever.controllability,
      affectedProducts: lever.affectedProducts.size,
    }))
    .sort((a, b) => b.value - a.value);
  const reductionLevers = [...topLevers].sort((a, b) => b.reductionImpact - a.reductionImpact);
  const risks = activeCostDrivers
    .map((product) => {
      const pressure = product.precioLitro > 0 ? product.costoGestionLitro / product.precioLitro : 0;
      return {
        producto: product.producto,
        margenGestionLitro: product.margenGestionLitro,
        costoGestionLitro: product.costoGestionLitro,
        precioLitro: product.precioLitro,
        litros: product.litros,
        pressure,
      };
    })
    .sort((a, b) => {
      if (a.margenGestionLitro < 0 && b.margenGestionLitro >= 0) return -1;
      if (b.margenGestionLitro < 0 && a.margenGestionLitro >= 0) return 1;
      return b.pressure - a.pressure;
    });
  const insights: CostInsights = {
    topGlobalDriver: topLevers[0] ?? null,
    bestReductionLever: reductionLevers.find((lever) => lever.reductionImpact > 0) ?? null,
    riskiestProduct: risks[0] ?? null,
    totalReduciblePerLiter: litrosTotales
      ? reductionLevers.reduce((total, lever) => total + lever.reductionImpact, 0) / litrosTotales
      : 0,
    topLevers: topLevers.slice(0, 6),
    risks: risks.slice(0, 4),
  };

  return {
    purchases,
    sales,
    products,
    costDrivers,
    insights,
    kpis: {
      litrosTotales,
      facturacionAnalizada,
      facturacionTotal,
      resultadoIndustrial,
      gastosAdmin,
      gastosComerciales,
      costosFijos,
      resultadoCore,
      resultadoNetoLitro: litrosTotales ? resultadoCore / litrosTotales : 0,
      margenEquilibrioLitro,
      puntoEquilibrioLitros,
      logisticaOptiblueLitro,
      costoFabrilLitro,
      gasIndustrialLitro,
      muestrasPorLitro,
      precintosPorLitro,
      costoBotellaMuestra,
      costoTapaMuestra,
      costoPrecinto,
      comprobantesConMuestra,
      ibcConPrecinto,
    },
    review: {
      compras: purchases.length,
      ventas: sales.length,
      comprasRevisar: purchases.filter((row) => row.tipo === "REVISAR").length,
      ventasRevisar: sales.filter((row) => row.revisar).length,
    },
  };
}

function detectWorkbookKind(workbook: XLSX.WorkBook) {
  const hasPurchases =
    workbook.SheetNames.includes("COMPRAS_RAW") ||
    workbook.SheetNames.some((sheet) => groupedPurchaseRowsFromSheet(workbook, sheet).length > 0);
  const hasSales =
    workbook.SheetNames.includes("VENTAS_RAW") ||
    workbook.SheetNames.some((sheet) => groupedSalesRowsFromSheet(workbook, sheet).length > 0);
  return { hasPurchases, hasSales };
}

export function CostCalculator() {
  const [purchasesWorkbook, setPurchasesWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [salesWorkbook, setSalesWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [purchasesFileName, setPurchasesFileName] = useState("");
  const [salesFileName, setSalesFileName] = useState("");
  const [error, setError] = useState("");
  const [params, setParams] = useState<CostParams>(DEFAULT_PARAMS);
  const [customPurchaseRules, setCustomPurchaseRules] = useState<PurchaseRule[]>([]);
  const [customSalesRules, setCustomSalesRules] = useState<SalesRule[]>([]);
  const [activeView, setActiveView] = useState<CostView>("calculo");
  const [configurationLoaded, setConfigurationLoaded] = useState(false);
  const [configurationSource, setConfigurationSource] = useState<"api" | "local">("local");
  const [configurationExportFile, setConfigurationExportFile] = useState<{
    content: string;
    fileName: string;
    url: string;
  } | null>(null);
  const [configurationImportText, setConfigurationImportText] = useState("");
  const [configurationTransferMessage, setConfigurationTransferMessage] = useState("");
  const configurationExportTextRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadConfiguration() {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const savedPurchaseRules = window.localStorage.getItem(PURCHASE_RULES_STORAGE_KEY);
      const savedSalesRules = window.localStorage.getItem(SALES_RULES_STORAGE_KEY);
      const savedPurchaseFile = window.localStorage.getItem(PURCHASE_FILE_STORAGE_KEY);
      const savedSalesFile = window.localStorage.getItem(SALES_FILE_STORAGE_KEY);

      try {
        if (saved) setParams({ ...DEFAULT_PARAMS, ...JSON.parse(saved) });
        if (savedPurchaseRules) setCustomPurchaseRules(JSON.parse(savedPurchaseRules));
        if (savedSalesRules) setCustomSalesRules(JSON.parse(savedSalesRules));

        const purchaseFile = parseStoredWorkbook(savedPurchaseFile);
        if (purchaseFile) {
          setPurchasesWorkbook(purchaseFile.workbook);
          setPurchasesFileName(purchaseFile.fileName);
        }
        const salesFile = parseStoredWorkbook(savedSalesFile);
        if (salesFile) {
          setSalesWorkbook(salesFile.workbook);
          setSalesFileName(salesFile.fileName);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(PURCHASE_RULES_STORAGE_KEY);
        window.localStorage.removeItem(SALES_RULES_STORAGE_KEY);
        window.localStorage.removeItem(PURCHASE_FILE_STORAGE_KEY);
        window.localStorage.removeItem(SALES_FILE_STORAGE_KEY);
      }

      try {
        const configuration = await fetchCostConfiguration();
        if (ignore) return;
        if (configuration.params) {
          setParams({ ...DEFAULT_PARAMS, ...configuration.params });
        }
        setCustomPurchaseRules(configuration.purchaseRules ?? []);
        setCustomSalesRules(configuration.salesRules ?? []);
        setConfigurationSource("api");
      } catch {
        setConfigurationSource("local");
      } finally {
        if (!ignore) setConfigurationLoaded(true);
      }
    }

    loadConfiguration();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!configurationLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  }, [configurationLoaded, params]);

  useEffect(() => {
    if (!configurationLoaded) return;
    window.localStorage.setItem(PURCHASE_RULES_STORAGE_KEY, JSON.stringify(customPurchaseRules));
  }, [configurationLoaded, customPurchaseRules]);

  useEffect(() => {
    if (!configurationLoaded) return;
    window.localStorage.setItem(SALES_RULES_STORAGE_KEY, JSON.stringify(customSalesRules));
  }, [configurationLoaded, customSalesRules]);

  useEffect(() => {
    if (!configurationLoaded) return;
    persistCostConfiguration({
      params,
      purchaseRules: customPurchaseRules,
      salesRules: customSalesRules,
    })
      .then(() => setConfigurationSource("api"))
      .catch(() => setConfigurationSource("local"));
  }, [configurationLoaded, customPurchaseRules, customSalesRules, params]);

  useEffect(() => {
    return () => {
      if (configurationExportFile) window.URL.revokeObjectURL(configurationExportFile.url);
    };
  }, [configurationExportFile]);

  const purchaseRules = useMemo(
    () => [...PURCHASE_RULES, ...customPurchaseRules],
    [customPurchaseRules],
  );
  const salesRules = useMemo(
    () => [...SALES_RULES, ...customSalesRules],
    [customSalesRules],
  );

  const model = useMemo(
    () => buildCostModel(purchasesWorkbook, salesWorkbook, params, purchaseRules, salesRules),
    [params, purchaseRules, purchasesWorkbook, salesRules, salesWorkbook],
  );

  useEffect(() => {
    if (!configurationLoaded) return;
    if (!model) {
      window.localStorage.removeItem(COST_MODEL_SNAPSHOT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(
      COST_MODEL_SNAPSHOT_STORAGE_KEY,
      JSON.stringify({
        updatedAt: Date.now(),
        files: {
          purchases: purchasesFileName,
          sales: salesFileName,
        },
        kpis: model.kpis,
        insights: model.insights,
        products: model.products,
        review: model.review,
      }),
    );
  }, [configurationLoaded, model, purchasesFileName, salesFileName]);

  async function parseFile(file: File | undefined) {
    if (!file) return null;
    const buffer = await file.arrayBuffer();
    return {
      buffer,
      workbook: XLSX.read(buffer, { type: "array", cellDates: true }),
    };
  }

  async function handlePurchases(file: File | undefined) {
    setError("");
    try {
      const parsed = await parseFile(file);
      if (!parsed) return;
      if (!detectWorkbookKind(parsed.workbook).hasPurchases) {
        throw new Error("El archivo seleccionado no parece ser un detalle de compras.");
      }
      setPurchasesWorkbook(parsed.workbook);
      setPurchasesFileName(file?.name ?? "");
      window.localStorage.setItem(
        PURCHASE_FILE_STORAGE_KEY,
        JSON.stringify({ fileName: file?.name ?? "", data: arrayBufferToBase64(parsed.buffer) }),
      );
    } catch (caught) {
      setPurchasesWorkbook(null);
      setPurchasesFileName("");
      setError(caught instanceof Error ? caught.message : "No se pudo leer compras.");
    }
  }

  async function handleSales(file: File | undefined) {
    setError("");
    try {
      const parsed = await parseFile(file);
      if (!parsed) return;
      if (!detectWorkbookKind(parsed.workbook).hasSales) {
        throw new Error("El archivo seleccionado no parece ser un detalle de ventas.");
      }
      setSalesWorkbook(parsed.workbook);
      setSalesFileName(file?.name ?? "");
      window.localStorage.setItem(
        SALES_FILE_STORAGE_KEY,
        JSON.stringify({ fileName: file?.name ?? "", data: arrayBufferToBase64(parsed.buffer) }),
      );
    } catch (caught) {
      setSalesWorkbook(null);
      setSalesFileName("");
      setError(caught instanceof Error ? caught.message : "No se pudo leer ventas.");
    }
  }

  function updateParam(name: keyof CostParams, value: number) {
    setParams((current) => ({ ...current, [name]: value }));
  }

  function clearSavedFiles() {
    setPurchasesWorkbook(null);
    setSalesWorkbook(null);
    setPurchasesFileName("");
    setSalesFileName("");
    window.localStorage.removeItem(PURCHASE_FILE_STORAGE_KEY);
    window.localStorage.removeItem(SALES_FILE_STORAGE_KEY);
  }

  function exportConfiguration() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      params,
      purchaseRules: customPurchaseRules,
      salesRules: customSalesRules,
    };
    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], {
      type: "application/json",
    });
    if (configurationExportFile) window.URL.revokeObjectURL(configurationExportFile.url);
    const url = window.URL.createObjectURL(blob);
    setConfigurationExportFile({
      content,
      fileName: `configuracion-costos-${new Date().toISOString().slice(0, 10)}.json`,
      url,
    });
    setConfigurationTransferMessage("Configuracion generada. Si la descarga no funciona, usa copiar.");
  }

  function applyConfigurationPayload(raw: string) {
    const payload = JSON.parse(raw) as Partial<CostConfigurationPayload>;
    setParams({ ...DEFAULT_PARAMS, ...(payload.params ?? {}) });
    setCustomPurchaseRules(payload.purchaseRules ?? []);
    setCustomSalesRules(payload.salesRules ?? []);
    setConfigurationLoaded(true);
    setError("");
    setConfigurationTransferMessage("Configuracion importada.");
  }

  async function copyConfiguration() {
    if (!configurationExportFile) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(configurationExportFile.content);
        setConfigurationTransferMessage("Configuracion copiada.");
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      const textArea = configurationExportTextRef.current;
      if (!textArea) {
        setConfigurationTransferMessage("No pude copiar automaticamente. Selecciona el texto y copialo manualmente.");
        return;
      }

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      try {
        const copied = document.execCommand("copy");
        setConfigurationTransferMessage(
          copied
            ? "Configuracion copiada."
            : "No pude copiar automaticamente. El texto quedo seleccionado para copiarlo manualmente.",
        );
      } catch {
        setConfigurationTransferMessage("No pude copiar automaticamente. El texto quedo seleccionado para copiarlo manualmente.");
      }
    }
  }

  async function importConfiguration(file: File | undefined) {
    if (!file) return;
    try {
      applyConfigurationPayload(await file.text());
    } catch {
      setError("No se pudo importar la configuracion de costos.");
    }
  }

  function importConfigurationFromText() {
    try {
      applyConfigurationPayload(configurationImportText);
    } catch {
      setError("No se pudo importar el texto de configuracion.");
    }
  }

  function savePurchaseRule(rule: PurchaseRule) {
    setCustomPurchaseRules((current) => [
      rule,
      ...current.filter(
        (item) => key(item.articulo) !== key(rule.articulo) || key(item.proveedor) !== key(rule.proveedor),
      ),
    ]);
  }

  function saveSalesRule(rule: SalesRule) {
    setCustomSalesRules((current) => [
      rule,
      ...current.filter((item) => key(item.articulo) !== key(rule.articulo)),
    ]);
  }

  function updatePurchaseRule(index: number, rule: PurchaseRule) {
    setCustomPurchaseRules((current) => current.map((item, itemIndex) => (itemIndex === index ? rule : item)));
  }

  function updateSalesRule(index: number, rule: SalesRule) {
    setCustomSalesRules((current) => current.map((item, itemIndex) => (itemIndex === index ? rule : item)));
  }

  function deletePurchaseRule(index: number) {
    setCustomPurchaseRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function deleteSalesRule(index: number) {
    setCustomSalesRules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="costs-layout">
      <section className="costs-header">
        <div>
          <p className="eyebrow">Reportes / Costos</p>
          <h1>Calculadora de costos operativo</h1>
          <p>
            Importa compras y ventas del ERP. Los parametros y reglas base viven
            en la app para no depender de una planilla intermedia.
          </p>
          <span className="config-status">
            Configuracion: {configurationSource === "api" ? "base de datos" : "local"}
          </span>
          {(purchasesFileName || salesFileName) ? (
            <button className="button-secondary compact-action" type="button" onClick={clearSavedFiles}>
              Borrar archivos guardados
            </button>
          ) : null}
        </div>
        <div className="upload-stack">
          <label className="upload-zone">
            <span>Compras XLSX</span>
            <strong>{purchasesFileName || "Seleccionar compras"}</strong>
            <input accept=".xlsx,.xls" type="file" onChange={(event) => handlePurchases(event.target.files?.[0])} />
          </label>
          <label className="upload-zone">
            <span>Ventas XLSX</span>
            <strong>{salesFileName || "Seleccionar ventas"}</strong>
            <input accept=".xlsx,.xls" type="file" onChange={(event) => handleSales(event.target.files?.[0])} />
          </label>
          <div className="config-transfer">
            <button className="button-secondary" type="button" onClick={exportConfiguration}>
              Generar configuracion
            </button>
            <label className="button-secondary import-config-button">
              Importar configuracion
              <input
                accept=".json,application/json"
                type="file"
                onChange={(event) => importConfiguration(event.target.files?.[0])}
              />
            </label>
          </div>
          {configurationExportFile ? (
            <div className="config-export-ready">
              <div className="export-ready">
                <span>{configurationExportFile.fileName}</span>
                <a className="button" download={configurationExportFile.fileName} href={configurationExportFile.url}>
                  Descargar configuracion
                </a>
                <button className="button-secondary" type="button" onClick={copyConfiguration}>
                  Copiar configuracion
                </button>
              </div>
              <textarea
                aria-label="Configuracion exportada"
                className="config-textarea"
                readOnly
                ref={configurationExportTextRef}
                value={configurationExportFile.content}
              />
            </div>
          ) : null}
          <div className="config-import-text">
            <textarea
              aria-label="Pegar configuracion"
              className="config-textarea"
              onChange={(event) => setConfigurationImportText(event.target.value)}
              placeholder="Pegar configuracion JSON"
              value={configurationImportText}
            />
            <button
              className="button-secondary"
              disabled={!configurationImportText.trim()}
              type="button"
              onClick={importConfigurationFromText}
            >
              Importar texto
            </button>
          </div>
          {configurationTransferMessage ? (
            <p className="config-transfer-message">{configurationTransferMessage}</p>
          ) : null}
        </div>
      </section>

      {error ? <div className="message error">{error}</div> : null}

      <nav className="cost-subnav" aria-label="Modulo de costos">
        <button
          className={activeView === "calculo" ? "active" : ""}
          onClick={() => setActiveView("calculo")}
          type="button"
        >
          Calculo de costos
        </button>
        <button
          className={activeView === "imputacion" ? "active" : ""}
          onClick={() => setActiveView("imputacion")}
          type="button"
        >
          Imputacion de costos
        </button>
        <button
          className={activeView === "maestro" ? "active" : ""}
          onClick={() => setActiveView("maestro")}
          type="button"
        >
          Maestro de imputaciones
        </button>
      </nav>

      {activeView === "calculo" ? (
        <section className="panel config-panel">
          <div className="config-head">
            <div>
              <h2>Parametros editables</h2>
              <p>Se guardan localmente en este navegador.</p>
            </div>
            <button className="button-secondary" type="button" onClick={() => setParams(DEFAULT_PARAMS)}>
              Restaurar valores
            </button>
          </div>
          <div className="assumption-grid params-grid">
            <AssumptionInput label="Urea OptiBlue ton" value={params.costoUreaOptiblueTon} onChange={(value) => updateParam("costoUreaOptiblueTon", value)} />
            <AssumptionInput label="Bidon 10L" value={params.costoBidon10} onChange={(value) => updateParam("costoBidon10", value)} />
            <AssumptionInput label="Bidon 20L" value={params.costoBidon20} onChange={(value) => updateParam("costoBidon20", value)} />
            <AssumptionInput label="Etiqueta 15" value={params.costoEtiqueta15} onChange={(value) => updateParam("costoEtiqueta15", value)} />
            <AssumptionInput label="Etiqueta 23" value={params.costoEtiqueta23} onChange={(value) => updateParam("costoEtiqueta23", value)} />
            <AssumptionInput label="OptiPure $/L" value={params.costoOptipureGranelLitro} onChange={(value) => updateParam("costoOptipureGranelLitro", value)} />
            <AssumptionInput label="Bidon OP" value={params.costoBidonOptipure} onChange={(value) => updateParam("costoBidonOptipure", value)} />
            <AssumptionInput label="Etiqueta OP" value={params.costoEtiquetaOptipure} onChange={(value) => updateParam("costoEtiquetaOptipure", value)} />
            <AssumptionInput label="Botella muestra" value={params.costoBotellaMuestra} onChange={(value) => updateParam("costoBotellaMuestra", value)} />
            <AssumptionInput label="Tapa muestra" value={params.costoTapaMuestra} onChange={(value) => updateParam("costoTapaMuestra", value)} />
            <AssumptionInput label="Precinto" value={params.costoPrecinto} onChange={(value) => updateParam("costoPrecinto", value)} />
            <AssumptionInput label="Muestras/doc." value={params.consumoMuestrasPorComprobante} onChange={(value) => updateParam("consumoMuestrasPorComprobante", value)} />
            <AssumptionInput label="Precintos/IBC" value={params.consumoPrecintosPorIbc} onChange={(value) => updateParam("consumoPrecintosPorIbc", value)} />
            <AssumptionInput label="Litros/IBC" value={params.litrosPorIbc} onChange={(value) => updateParam("litrosPorIbc", value)} />
            <AssumptionInput label="IIBB" suffix="%" value={params.iibbPct * 100} onChange={(value) => updateParam("iibbPct", value / 100)} />
            <AssumptionInput label="Comision" suffix="%" value={params.comisionPct * 100} onChange={(value) => updateParam("comisionPct", value / 100)} />
            <AssumptionInput label="Combustible OB" suffix="%" value={params.pctCombustibleOptiblue * 100} onChange={(value) => updateParam("pctCombustibleOptiblue", value / 100)} />
            <AssumptionInput label="Sueldos admin" value={params.sueldosAdmin} onChange={(value) => updateParam("sueldosAdmin", value)} />
            <AssumptionInput label="Sueldos prod." value={params.sueldosProduccion} onChange={(value) => updateParam("sueldosProduccion", value)} />
            <AssumptionInput label="Fazon 32,5 L" value={params.litrosFazon325} onChange={(value) => updateParam("litrosFazon325", value)} />
            <AssumptionInput label="Fazon ind. L" value={params.litrosFazonIndustrial} onChange={(value) => updateParam("litrosFazonIndustrial", value)} />
          </div>
        </section>
      ) : null}

      {activeView === "maestro" ? (
        <AllocationMaster
          customPurchaseRules={customPurchaseRules}
          customSalesRules={customSalesRules}
          onAddPurchase={savePurchaseRule}
          onAddSales={saveSalesRule}
          onDeletePurchase={deletePurchaseRule}
          onDeleteSales={deleteSalesRule}
          onUpdatePurchase={updatePurchaseRule}
          onUpdateSales={updateSalesRule}
        />
      ) : !model ? (
        <section className="empty-state costs-empty">
          <strong>Listo para calcular.</strong>
          <span>Carga compras y ventas del ERP para cruzar costos, litros y facturacion.</span>
        </section>
      ) : activeView === "calculo" ? (
        <>
          <section className="kpi-grid">
            <Kpi label="Resultado core" value={money(model.kpis.resultadoCore)} tone={model.kpis.resultadoCore >= 0 ? "good" : "bad"} />
            <Kpi label="Punto equilibrio" value={`${number(model.kpis.puntoEquilibrioLitros)} L`} />
            <Kpi label="Resultado neto x L" value={money(model.kpis.resultadoNetoLitro)} />
            <Kpi label="Facturacion analizada" value={money(model.kpis.facturacionAnalizada)} />
          </section>

          <section className="content-grid costs-content">
            <article className="table-card">
              <h2>Margen por producto</h2>
              <p>Precio, costo variable y contribucion calculados desde los archivos importados.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Litros</th>
                      <th>Precio/L</th>
                      <th>Costo/L</th>
                      <th>Margen/L</th>
                      <th>Margen total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.products.map((row) => (
                      <tr key={row.producto}>
                        <td><strong>{row.producto}</strong></td>
                        <td>{number(row.litros)}</td>
                        <td>{money(row.precioLitro)}</td>
                        <td>{money(row.costoLitro)}</td>
                        <td className={row.margenLitro < 0 ? "negative" : ""}>{money(row.margenLitro)}</td>
                        <td className={row.margenTotal < 0 ? "negative" : ""}>{money(row.margenTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel">
              <h2>Control de importacion</h2>
              <div className="trace-list">
                <div className="trace-item">
                  <strong>{model.review.compras} compras leidas</strong>
                  <span>{model.review.comprasRevisar} quedaron para revisar reglas.</span>
                </div>
                <div className="trace-item">
                  <strong>{model.review.ventas} ventas leidas</strong>
                  <span>{model.review.ventasRevisar} articulos no matchearon con reglas de venta.</span>
                </div>
                <div className="trace-item">
                  <strong>{number(model.kpis.litrosTotales)} litros analizados</strong>
                  <span>Margen de equilibrio: {money(model.kpis.margenEquilibrioLitro)} por litro.</span>
                </div>
              </div>
            </article>
          </section>

          <PendingClassification
            model={model}
            onSavePurchase={savePurchaseRule}
            onSaveSale={saveSalesRule}
          />

          <CostDriversPanel model={model} />

          <section className="kpi-grid secondary-kpis">
            <Kpi label="Logistica OptiBlue x L" value={money(model.kpis.logisticaOptiblueLitro)} />
            <Kpi label="Costo fabril x L" value={money(model.kpis.costoFabrilLitro)} />
            <Kpi label="Gas industria x L" value={money(model.kpis.gasIndustrialLitro)} />
            <Kpi label="Muestras x L" value={money(model.kpis.muestrasPorLitro)} />
            <Kpi label="Precintos x L" value={money(model.kpis.precintosPorLitro)} />
            <Kpi label="Facturacion cubierta" value={pct(model.kpis.facturacionTotal ? model.kpis.facturacionAnalizada / model.kpis.facturacionTotal : 0)} />
          </section>
        </>
      ) : (
        <AllocationAudit
          model={model}
          onSavePurchase={savePurchaseRule}
          onSaveSale={saveSalesRule}
        />
      )}
    </div>
  );
}

function CostDriversPanel({ model }: { model: CostModel }) {
  const visibleProducts = model.costDrivers.filter(
    (product) => product.litros > 0 || product.costoGestionLitro > 0,
  );
  const { insights } = model;

  return (
    <section className="cost-drivers-section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Drivers de costo</p>
          <h2>Que empuja el precio por producto</h2>
          <p>
            Ranking por incidencia en el costo por litro. El costo de gestion suma variables e indirectos
            para ver la presion real sobre el precio.
          </p>
        </div>
        <div className="driver-summary">
          {insights.topLevers.slice(0, 4).map((driver) => (
            <span key={driver.label}>{driver.label}</span>
          ))}
        </div>
      </div>

      <div className="insight-grid">
        <article className="insight-card">
          <span>Mayor incidencia global</span>
          <strong>{insights.topGlobalDriver?.label ?? "Sin datos"}</strong>
          <p>
            {insights.topGlobalDriver
              ? `${pct(insights.topGlobalDriver.share)} del costo ponderado analizado.`
              : "Carga ventas y compras para ver el costo dominante."}
          </p>
        </article>
        <article className="insight-card">
          <span>Mejor palanca reducible</span>
          <strong>{insights.bestReductionLever?.label ?? "Sin palanca"}</strong>
          <p>
            {insights.bestReductionLever
              ? `Un 10% menos impacta aprox. ${money(insights.bestReductionLever.reductionImpact)} en el periodo.`
              : "Todavia no hay drivers controlables con impacto calculado."}
          </p>
        </article>
        <article className="insight-card">
          <span>Producto bajo presion</span>
          <strong>{insights.riskiestProduct?.producto ?? "Sin datos"}</strong>
          <p>
            {insights.riskiestProduct
              ? `${pct(insights.riskiestProduct.pressure)} del precio queda absorbido por costos de gestion.`
              : "No hay productos con precio y costo comparables."}
          </p>
        </article>
        <article className="insight-card">
          <span>Potencial total 10%</span>
          <strong>{money(insights.totalReduciblePerLiter)} / L</strong>
          <p>Ahorro ponderado si se reducen 10% las palancas controlables.</p>
        </article>
      </div>

      <div className="lever-board">
        <article className="lever-panel">
          <div>
            <p className="eyebrow">Palancas</p>
            <h3>Donde enfocar reduccion</h3>
          </div>
          <div className="lever-list">
            {insights.topLevers.map((lever) => (
              <div className="lever-row" key={lever.label}>
                <div>
                  <strong>{lever.label}</strong>
                  <span>{lever.affectedProducts} productos afectados - control {lever.controllability}</span>
                </div>
                <div>
                  <strong>{pct(lever.share)}</strong>
                  <span>{money(lever.reductionImpact)} impacto 10%</span>
                </div>
              </div>
            ))}
          </div>
        </article>
        <article className="lever-panel">
          <div>
            <p className="eyebrow">Alertas</p>
            <h3>Productos a revisar primero</h3>
          </div>
          <div className="lever-list">
            {insights.risks.map((risk) => (
              <div className="lever-row" key={risk.producto}>
                <div>
                  <strong>{risk.producto}</strong>
                  <span>{number(risk.litros)} L analizados - costo {money(risk.costoGestionLitro)} / L</span>
                </div>
                <div>
                  <strong className={risk.margenGestionLitro < 0 ? "negative" : undefined}>
                    {money(risk.margenGestionLitro)}
                  </strong>
                  <span>{pct(risk.pressure)} presion</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="driver-grid">
        {visibleProducts.map((product) => (
          <article className="driver-card" key={product.producto}>
            <div className="driver-card-head">
              <div>
                <h3>{product.producto}</h3>
                <span>{number(product.litros)} L analizados</span>
              </div>
              <strong>{product.topDriver?.label ?? "Sin driver"}</strong>
            </div>

            <div className="driver-metrics">
              <div>
                <span>Costo gestion/L</span>
                <strong>{money(product.costoGestionLitro)}</strong>
              </div>
              <div>
                <span>Margen gestion/L</span>
                <strong className={product.margenGestionLitro < 0 ? "negative" : undefined}>
                  {money(product.margenGestionLitro)}
                </strong>
              </div>
              <div>
                <span>Potencial 10%</span>
                <strong>{money(product.reducibleTotal)}</strong>
              </div>
            </div>

            <div className="driver-bars">
              {product.drivers.slice(0, 5).map((driver) => (
                <div className="driver-row" key={`${product.producto}-${driver.label}`}>
                  <div>
                    <span>{driver.label}</span>
                    <strong>{money(driver.value)} / L</strong>
                  </div>
                  <div className="driver-bar">
                    <span style={{ width: `${Math.max(driver.share * 100, 3)}%` }} />
                  </div>
                  <em>{pct(driver.share)}</em>
                </div>
              ))}
            </div>

            <p className="driver-opportunity">{product.opportunity}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AssumptionInput({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="assumption">
      <span>{label}</span>
      <div>
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(num(event.target.value))}
        />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}

function PendingClassification({
  model,
  onSavePurchase,
  onSaveSale,
}: {
  model: CostModel;
  onSavePurchase: (rule: PurchaseRule) => void;
  onSaveSale: (rule: SalesRule) => void;
}) {
  const pendingPurchases = useMemo(() => {
    const grouped = new Map<string, { articulo: string; proveedor: string; count: number; total: number }>();
    model.purchases
      .filter((row) => row.tipo === "REVISAR")
      .forEach((row) => {
        const id = `${key(row.articulo)}|${key(row.proveedor)}`;
        const current = grouped.get(id) ?? {
          articulo: row.articulo,
          proveedor: row.proveedor,
          count: 0,
          total: 0,
        };
        current.count += 1;
        current.total += row.total;
        grouped.set(id, current);
      });
    return Array.from(grouped.values()).slice(0, 12);
  }, [model.purchases]);

  const pendingSales = useMemo(() => {
    const grouped = new Map<string, { articulo: string; count: number; total: number; cantidad: number }>();
    model.sales
      .filter((row) => row.revisar)
      .forEach((row) => {
        const id = key(row.articulo);
        const current = grouped.get(id) ?? {
          articulo: row.articulo,
          count: 0,
          total: 0,
          cantidad: 0,
        };
        current.count += 1;
        current.total += row.total;
        current.cantidad += row.cantidad;
        grouped.set(id, current);
      });
    return Array.from(grouped.values()).slice(0, 12);
  }, [model.sales]);

  if (!pendingPurchases.length && !pendingSales.length) {
    return (
      <section className="panel">
        <h2>Reglas de clasificacion</h2>
        <p>No hay pendientes de clasificacion con los archivos cargados.</p>
      </section>
    );
  }

  return (
    <section className="pending-grid">
      <article className="table-card">
        <h2>Compras para revisar</h2>
        <p>Guarda una regla por articulo/proveedor y el calculo se actualiza al instante.</p>
        <div className="pending-list">
          {pendingPurchases.map((item) => (
            <PendingPurchaseRule
              item={item}
              key={`${item.articulo}|${item.proveedor}`}
              onSave={onSavePurchase}
            />
          ))}
        </div>
      </article>

      <article className="table-card">
        <h2>Ventas para revisar</h2>
        <p>Mapea articulos del ERP a productos estandar para calcular litros y margen.</p>
        <div className="pending-list">
          {pendingSales.map((item) => (
            <PendingSalesRule item={item} key={item.articulo} onSave={onSaveSale} />
          ))}
        </div>
      </article>
    </section>
  );
}

function AllocationAudit({
  model,
  onSavePurchase,
  onSaveSale,
}: {
  model: CostModel;
  onSavePurchase: (rule: PurchaseRule) => void;
  onSaveSale: (rule: SalesRule) => void;
}) {
  const [exportFile, setExportFile] = useState<{
    fileName: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (exportFile) window.URL.revokeObjectURL(exportFile.url);
    };
  }, [exportFile]);

  const purchaseAudit = useMemo(() => {
    const grouped = new Map<
      string,
      {
        articulo: string;
        proveedor: string;
        tipo: string;
        producto: string;
        count: number;
        total: number;
      }
    >();

    model.purchases.forEach((row) => {
      const id = `${key(row.articulo)}|${key(row.proveedor)}|${row.tipo}|${row.producto}`;
      const current = grouped.get(id) ?? {
        articulo: row.articulo,
        proveedor: row.proveedor,
        tipo: row.tipo,
        producto: row.producto,
        count: 0,
        total: 0,
      };
      current.count += 1;
      current.total += row.total;
      grouped.set(id, current);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.tipo === "REVISAR" && b.tipo !== "REVISAR") return -1;
      if (a.tipo !== "REVISAR" && b.tipo === "REVISAR") return 1;
      return Math.abs(b.total) - Math.abs(a.total);
    });
  }, [model.purchases]);

  const salesAudit = useMemo(() => {
    const grouped = new Map<
      string,
      {
        articulo: string;
        tipo: string;
        producto: string;
        count: number;
        litros: number;
        total: number;
      }
    >();

    model.sales.forEach((row) => {
      const id = `${key(row.articulo)}|${row.tipo}|${row.producto}`;
      const current = grouped.get(id) ?? {
        articulo: row.articulo,
        tipo: row.tipo,
        producto: row.producto,
        count: 0,
        litros: 0,
        total: 0,
      };
      current.count += 1;
      current.litros += row.litros;
      current.total += row.total;
      grouped.set(id, current);
    });

    return Array.from(grouped.values()).sort((a, b) => {
      if (a.tipo === "REVISAR" && b.tipo !== "REVISAR") return -1;
      if (a.tipo !== "REVISAR" && b.tipo === "REVISAR") return 1;
      return Math.abs(b.total) - Math.abs(a.total);
    });
  }, [model.sales]);

  function saveCurrentAllocations() {
    const purchaseRules = new Map<string, PurchaseRule>();
    model.purchases
      .filter((row) => row.tipo !== "REVISAR")
      .forEach((row) => {
        purchaseRules.set(`${key(row.articulo)}|${key(row.proveedor)}`, {
          articulo: row.articulo,
          proveedor: row.proveedor || "*",
          tipo: row.tipo,
          producto: row.producto,
        });
      });

    const salesRules = new Map<string, SalesRule>();
    model.sales
      .filter((row) => !row.revisar)
      .forEach((row) => {
        const factor = row.cantidad ? row.litros / row.cantidad : 0;
        salesRules.set(key(row.articulo), {
          articulo: row.articulo,
          tipo: row.tipo,
          producto: row.producto,
          generaLitros: factor > 0,
          factor,
        });
      });

    purchaseRules.forEach(onSavePurchase);
    salesRules.forEach(onSaveSale);
  }

  function exportAllocations() {
    const workbook = XLSX.utils.book_new();
    const exportedAt = new Date().toLocaleString("es-AR");

    const summaryRows = [
      { Indicador: "Fecha exportacion", Valor: exportedAt },
      { Indicador: "Compras leidas", Valor: model.review.compras },
      { Indicador: "Compras para revisar", Valor: model.review.comprasRevisar },
      { Indicador: "Ventas leidas", Valor: model.review.ventas },
      { Indicador: "Ventas para revisar", Valor: model.review.ventasRevisar },
      { Indicador: "Litros analizados", Valor: model.kpis.litrosTotales },
      { Indicador: "Facturacion analizada", Valor: model.kpis.facturacionAnalizada },
      { Indicador: "Resultado core", Valor: model.kpis.resultadoCore },
    ];

    const purchaseRows = purchaseAudit.map((row) => ({
      Articulo: row.articulo,
      Proveedor: row.proveedor || "",
      Tipo: row.tipo,
      Producto: row.producto,
      Filas: row.count,
      Total_Neto: row.total,
      Estado: row.tipo === "REVISAR" ? "REVISAR" : "IMPUTADO",
    }));

    const salesRows = salesAudit.map((row) => ({
      Articulo: row.articulo,
      Tipo: row.tipo,
      Producto: row.producto,
      Filas: row.count,
      Litros: row.litros,
      Total_Neto: row.total,
      Estado: row.tipo === "REVISAR" ? "REVISAR" : "IMPUTADO",
    }));

    const purchaseDetailRows = model.purchases.map((row) => ({
      Comprobante: row.comprobante,
      Articulo: row.articulo,
      Proveedor: row.proveedor,
      Cantidad: row.cantidad,
      Precio_Unitario: row.precioUnitario,
      Total_Neto: row.total,
      Tipo: row.tipo,
      Producto: row.producto,
      Estado: row.tipo === "REVISAR" ? "REVISAR" : "IMPUTADO",
    }));

    const salesDetailRows = model.sales.map((row) => ({
      Comprobante: row.comprobante,
      Articulo: row.articulo,
      Cliente: row.cliente,
      Cantidad: row.cantidad,
      Litros: row.litros,
      Total_Neto: row.total,
      Tipo: row.tipo,
      Producto: row.producto,
      Estado: row.revisar ? "REVISAR" : "IMPUTADO",
    }));

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumen");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(purchaseRows), "Compras agrupadas");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesRows), "Ventas agrupadas");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(purchaseDetailRows), "Detalle compras");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesDetailRows), "Detalle ventas");

    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    if (exportFile) window.URL.revokeObjectURL(exportFile.url);
    const url = window.URL.createObjectURL(blob);
    setExportFile({
      fileName: `imputacion-costos-${new Date().toISOString().slice(0, 10)}.xlsx`,
      url,
    });
  }

  return (
    <section className="audit-section">
      <div className="audit-head">
        <div>
          <p className="eyebrow">Auditoria</p>
          <h2>Imputaciones detectadas</h2>
          <p>
            Vista de control para validar a que cuenta de costo o producto fue
            imputado cada articulo.
          </p>
        </div>
        <div className="audit-actions">
          <button className="button-secondary" type="button" onClick={exportAllocations}>
            Generar Excel
          </button>
          <button className="button" type="button" onClick={saveCurrentAllocations}>
            Guardar imputaciones actuales
          </button>
        </div>
      </div>

      {exportFile ? (
        <div className="export-ready">
          <span>{exportFile.fileName}</span>
          <a className="button" download={exportFile.fileName} href={exportFile.url}>
            Descargar archivo generado
          </a>
        </div>
      ) : null}

      <div className="audit-grid">
        <AuditTable
          columns={["Articulo", "Proveedor", "Tipo", "Producto", "Filas", "Total"]}
          rows={purchaseAudit.map((row) => [
            row.articulo,
            row.proveedor || "-",
            row.tipo,
            row.producto,
            number(row.count),
            money(row.total),
          ])}
          title="Compras"
        />
        <AuditTable
          columns={["Articulo", "Tipo", "Producto", "Filas", "Litros", "Total"]}
          rows={salesAudit.map((row) => [
            row.articulo,
            row.tipo,
            row.producto,
            number(row.count),
            number(row.litros),
            money(row.total),
          ])}
          title="Ventas"
        />
      </div>
    </section>
  );
}

function AuditTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <article className="table-card audit-card">
      <h2>{title}</h2>
      <div className="table-wrap audit-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    className={cell === "REVISAR" ? "audit-warning" : undefined}
                    key={`${title}-${rowIndex}-${cellIndex}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function AllocationMaster({
  customPurchaseRules,
  customSalesRules,
  onAddPurchase,
  onAddSales,
  onDeletePurchase,
  onDeleteSales,
  onUpdatePurchase,
  onUpdateSales,
}: {
  customPurchaseRules: PurchaseRule[];
  customSalesRules: SalesRule[];
  onAddPurchase: (rule: PurchaseRule) => void;
  onAddSales: (rule: SalesRule) => void;
  onDeletePurchase: (index: number) => void;
  onDeleteSales: (index: number) => void;
  onUpdatePurchase: (index: number, rule: PurchaseRule) => void;
  onUpdateSales: (index: number, rule: SalesRule) => void;
}) {
  const [search, setSearch] = useState("");
  const [newPurchaseRule, setNewPurchaseRule] = useState<PurchaseRule>({
    articulo: "",
    proveedor: "*",
    tipo: "ADMIN",
    producto: "Administracion",
  });
  const [newSalesRule, setNewSalesRule] = useState<SalesRule>({
    articulo: "",
    tipo: "PRODUCTO",
    producto: "OPTIBLUE_IBC",
    generaLitros: true,
    factor: 1,
  });

  const purchaseProductOptions = [...PURCHASE_PRODUCTS, ...PRODUCT_ORDER].filter(
    (option, index, options) => options.indexOf(option) === index,
  );
  const salesProductOptions = [...PRODUCT_ORDER, "IBC", "TARIMA", "TAMBOR", "ENVASES", "OTROS"];
  const normalizedSearch = key(search);
  const matches = (values: string[]) =>
    !normalizedSearch || values.some((value) => key(value).includes(normalizedSearch));

  const manualPurchases = customPurchaseRules
    .map((rule, index) => ({ index, rule }))
    .filter(({ rule }) => matches([rule.articulo, rule.proveedor, rule.tipo, rule.producto]));
  const basePurchases = PURCHASE_RULES.filter((rule) =>
    matches([rule.articulo, rule.proveedor, rule.tipo, rule.producto]),
  );
  const manualSales = customSalesRules
    .map((rule, index) => ({ index, rule }))
    .filter(({ rule }) => matches([rule.articulo, rule.tipo, rule.producto]));
  const baseSales = SALES_RULES.filter((rule) => matches([rule.articulo, rule.tipo, rule.producto]));
  const purchaseConflicts = customPurchaseRules.filter((rule) =>
    PURCHASE_RULES.some(
      (baseRule) =>
        key(baseRule.articulo) === key(rule.articulo) &&
        (baseRule.proveedor === "*" ||
          rule.proveedor === "*" ||
          key(baseRule.proveedor) === key(rule.proveedor)),
    ),
  );
  const salesConflicts = customSalesRules.filter((rule) =>
    SALES_RULES.some((baseRule) => key(baseRule.articulo) === key(rule.articulo)),
  );
  const sensitivePurchaseRules = customPurchaseRules.filter((rule) =>
    ["COMPENSACION_IF", "NO_COSTO", "INVERSION", "RESULTADO_FINANCIERO", "OTROS"].includes(rule.tipo),
  );
  const visiblePurchaseTypes = PURCHASE_TYPES.filter((tipo) => matches([tipo, purchaseTypeName(tipo)]));

  function addPurchaseRule() {
    if (!newPurchaseRule.articulo.trim()) return;
    onAddPurchase({
      ...newPurchaseRule,
      articulo: newPurchaseRule.articulo.trim(),
      proveedor: newPurchaseRule.proveedor.trim() || "*",
    });
    setNewPurchaseRule({ articulo: "", proveedor: "*", tipo: "ADMIN", producto: "Administracion" });
  }

  function addSalesRule() {
    if (!newSalesRule.articulo.trim()) return;
    onAddSales({
      ...newSalesRule,
      articulo: newSalesRule.articulo.trim(),
    });
    setNewSalesRule({
      articulo: "",
      tipo: "PRODUCTO",
      producto: "OPTIBLUE_IBC",
      generaLitros: true,
      factor: 1,
    });
  }

  return (
    <section className="audit-section master-section">
      <div className="audit-head">
        <div>
          <p className="eyebrow">Maestro</p>
          <h2>Maestro de imputaciones</h2>
          <p>
            Controla las reglas guardadas para compras y ventas sin depender de
            los archivos cargados del mes.
          </p>
        </div>
        <label className="master-search">
          <span>Buscar</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Articulo, proveedor o cuenta"
          />
        </label>
      </div>

      <div className="master-summary-grid">
        <article className="master-summary-card">
          <span>Manuales</span>
          <strong>{customPurchaseRules.length + customSalesRules.length}</strong>
          <p>Reglas editables que pisan a las reglas base cuando coinciden.</p>
        </article>
        <article className="master-summary-card">
          <span>Base app</span>
          <strong>{PURCHASE_RULES.length + SALES_RULES.length}</strong>
          <p>Reglas incluidas como punto de partida para compras y ventas.</p>
        </article>
        <article className={purchaseConflicts.length || salesConflicts.length ? "master-summary-card warning" : "master-summary-card"}>
          <span>Conflictos</span>
          <strong>{purchaseConflicts.length + salesConflicts.length}</strong>
          <p>Reglas manuales que reemplazan una regla base existente.</p>
        </article>
        <article className={sensitivePurchaseRules.length ? "master-summary-card attention" : "master-summary-card"}>
          <span>Sensibles</span>
          <strong>{sensitivePurchaseRules.length}</strong>
          <p>Compensaciones, inversiones, financieros u otros fuera del costo operativo.</p>
        </article>
      </div>

      <article className="table-card audit-card master-catalog-card">
        <div>
          <h2>Catalogo de tipos de compra</h2>
          <p>Usa estas categorias para separar costos reales, movimientos fuera del costo y compensaciones.</p>
        </div>
        <div className="master-catalog-grid">
          {visiblePurchaseTypes.map((tipo) => {
            const detail = PURCHASE_TYPE_DETAILS[tipo];
            return (
              <div className="master-type-card" key={tipo}>
                <div>
                  <strong>{tipo}</strong>
                  <span>{detail?.label ?? tipo}</span>
                </div>
                <p>{detail?.description ?? "Sin descripcion cargada."}</p>
                <em className={`master-impact ${detail?.impact.replace(/\s+/g, "-") ?? "revisar"}`}>
                  {detail?.impact ?? "revisar"}
                </em>
              </div>
            );
          })}
        </div>
      </article>

      <div className="master-grid">
        <article className="table-card audit-card">
          <h2>Compras manuales</h2>
          <p>Reglas editables que se guardan para futuras importaciones.</p>
          <div className="master-add-row purchase">
            <input
              aria-label="Articulo compra"
              value={newPurchaseRule.articulo}
              onChange={(event) => setNewPurchaseRule((current) => ({ ...current, articulo: event.target.value }))}
              placeholder="Articulo"
            />
            <input
              aria-label="Proveedor compra"
              value={newPurchaseRule.proveedor}
              onChange={(event) => setNewPurchaseRule((current) => ({ ...current, proveedor: event.target.value }))}
              placeholder="Proveedor o *"
            />
            <select
              value={newPurchaseRule.tipo}
              onChange={(event) => setNewPurchaseRule((current) => ({ ...current, tipo: event.target.value }))}
            >
              {PURCHASE_TYPES.map((option) => (
                <option key={option} value={option}>{purchaseTypeOptionLabel(option)}</option>
              ))}
            </select>
            <select
              value={newPurchaseRule.producto}
              onChange={(event) => setNewPurchaseRule((current) => ({ ...current, producto: event.target.value }))}
            >
              {purchaseProductOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <button className="button" type="button" onClick={addPurchaseRule}>
              Agregar
            </button>
          </div>
          <div className="table-wrap audit-table-wrap master-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Articulo</th>
                  <th>Proveedor</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {manualPurchases.map(({ index, rule }) => (
                  <tr key={`purchase-manual-${index}`}>
                    <td>
                      <input
                        value={rule.articulo}
                        onChange={(event) => onUpdatePurchase(index, { ...rule, articulo: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={rule.proveedor}
                        onChange={(event) => onUpdatePurchase(index, { ...rule, proveedor: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={rule.tipo}
                        onChange={(event) => onUpdatePurchase(index, { ...rule, tipo: event.target.value })}
                      >
                        {PURCHASE_TYPES.map((option) => (
                          <option key={option} value={option}>{purchaseTypeOptionLabel(option)}</option>
                        ))}
                      </select>
                      <small className="master-type-hint">{PURCHASE_TYPE_DETAILS[rule.tipo]?.impact ?? "revisar"}</small>
                    </td>
                    <td>
                      <select
                        value={rule.producto}
                        onChange={(event) => onUpdatePurchase(index, { ...rule, producto: event.target.value })}
                      >
                        {purchaseProductOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button className="button-secondary compact-table-action" type="button" onClick={() => onDeletePurchase(index)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {manualPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No hay reglas manuales de compra para esta busqueda.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="table-card audit-card">
          <h2>Ventas manuales</h2>
          <p>Mapeo editable entre articulos vendidos y productos de costo.</p>
          <div className="master-add-row sales">
            <input
              aria-label="Articulo venta"
              value={newSalesRule.articulo}
              onChange={(event) => setNewSalesRule((current) => ({ ...current, articulo: event.target.value }))}
              placeholder="Articulo"
            />
            <select
              value={newSalesRule.tipo}
              onChange={(event) => setNewSalesRule((current) => ({ ...current, tipo: event.target.value }))}
            >
              {SALES_TYPES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={newSalesRule.producto}
              onChange={(event) => setNewSalesRule((current) => ({ ...current, producto: event.target.value }))}
            >
              {salesProductOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              aria-label="Factor litros venta"
              type="number"
              value={newSalesRule.factor}
              onChange={(event) =>
                setNewSalesRule((current) => ({ ...current, factor: num(event.target.value) }))
              }
            />
            <label className="master-liters-toggle">
              <input
                type="checkbox"
                checked={newSalesRule.generaLitros}
                onChange={(event) =>
                  setNewSalesRule((current) => ({ ...current, generaLitros: event.target.checked }))
                }
              />
              Litros
            </label>
            <button className="button" type="button" onClick={addSalesRule}>
              Agregar
            </button>
          </div>
          <div className="table-wrap audit-table-wrap master-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Articulo</th>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th>Factor</th>
                  <th>Litros</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {manualSales.map(({ index, rule }) => (
                  <tr key={`sales-manual-${index}`}>
                    <td>
                      <input
                        value={rule.articulo}
                        onChange={(event) => onUpdateSales(index, { ...rule, articulo: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={rule.tipo}
                        onChange={(event) => onUpdateSales(index, { ...rule, tipo: event.target.value })}
                      >
                        {SALES_TYPES.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={rule.producto}
                        onChange={(event) => onUpdateSales(index, { ...rule, producto: event.target.value })}
                      >
                        {salesProductOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={rule.factor}
                        onChange={(event) => {
                          const factor = num(event.target.value);
                          onUpdateSales(index, { ...rule, factor });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={rule.generaLitros}
                        onChange={(event) => onUpdateSales(index, { ...rule, generaLitros: event.target.checked })}
                      />
                    </td>
                    <td>
                      <button className="button-secondary compact-table-action" type="button" onClick={() => onDeleteSales(index)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {manualSales.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No hay reglas manuales de venta para esta busqueda.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div className="master-grid">
        <ReadOnlyRuleTable
          columns={["Articulo", "Proveedor", "Tipo", "Producto"]}
          rows={basePurchases.map((rule) => [
            rule.articulo,
            rule.proveedor,
            `${rule.tipo} - ${purchaseTypeName(rule.tipo)}`,
            rule.producto,
          ])}
          title="Compras base"
        />
        <ReadOnlyRuleTable
          columns={["Articulo", "Tipo", "Producto", "Factor", "Litros"]}
          rows={baseSales.map((rule) => [
            rule.articulo,
            rule.tipo,
            rule.producto,
            number(rule.factor),
            rule.generaLitros ? "Si" : "No",
          ])}
          title="Ventas base"
        />
      </div>
    </section>
  );
}

function ReadOnlyRuleTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <article className="table-card audit-card">
      <h2>{title}</h2>
      <p>Reglas incluidas en la app como referencia.</p>
      <div className="table-wrap audit-table-wrap master-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>No hay reglas base para esta busqueda.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PendingPurchaseRule({
  item,
  onSave,
}: {
  item: { articulo: string; proveedor: string; count: number; total: number };
  onSave: (rule: PurchaseRule) => void;
}) {
  const [tipo, setTipo] = useState("ADMIN");
  const [producto, setProducto] = useState("Administracion");

  return (
    <div className="pending-item">
      <div className="pending-main">
        <strong>{item.articulo}</strong>
        <span>{item.proveedor || "Sin proveedor"} - {item.count} filas - {money(item.total)}</span>
      </div>
      <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
        {PURCHASE_TYPES.map((option) => (
          <option key={option} value={option}>{purchaseTypeOptionLabel(option)}</option>
        ))}
      </select>
      <select value={producto} onChange={(event) => setProducto(event.target.value)}>
        {PURCHASE_PRODUCTS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <button
        className="button"
        type="button"
        onClick={() => onSave({ articulo: item.articulo, proveedor: item.proveedor || "*", tipo, producto })}
      >
        Guardar
      </button>
    </div>
  );
}

function PendingSalesRule({
  item,
  onSave,
}: {
  item: { articulo: string; count: number; total: number; cantidad: number };
  onSave: (rule: SalesRule) => void;
}) {
  const [tipo, setTipo] = useState("PRODUCTO");
  const [producto, setProducto] = useState("OPTIBLUE_IBC");
  const [factor, setFactor] = useState(1);

  return (
    <div className="pending-item">
      <div className="pending-main">
        <strong>{item.articulo}</strong>
        <span>{item.count} filas - {number(item.cantidad)} unidades - {money(item.total)}</span>
      </div>
      <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
        {SALES_TYPES.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <select value={producto} onChange={(event) => setProducto(event.target.value)}>
        {PRODUCT_ORDER.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value="IBC">IBC</option>
        <option value="TARIMA">TARIMA</option>
        <option value="TAMBOR">TAMBOR</option>
        <option value="OTROS">OTROS</option>
      </select>
      <input
        aria-label="Factor litros"
        type="number"
        value={factor}
        onChange={(event) => setFactor(num(event.target.value))}
      />
      <button
        className="button"
        type="button"
        onClick={() => onSave({ articulo: item.articulo, tipo, producto, generaLitros: factor > 0, factor })}
      >
        Guardar
      </button>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <article className={`panel cost-kpi ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
