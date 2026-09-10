export function moduleForPath(path: string) {
  if (path === "/") return "dashboard";
  return path.split("/")[1];
}
export const modules = [
  ["dashboard", "Dashboard"], ["personal", "Personal"], ["pedidos", "Pedidos y remitos"],
  ["ventas", "Ventas"], ["stock", "Stock y depósitos"], ["compras", "Compras"],
  ["produccion", "Producción"], ["tesoreria", "Tesorería"], ["contabilidad", "Contabilidad"],
  ["reportes", "Reportes y costos"], ["maestros", "Maestros"],
];
