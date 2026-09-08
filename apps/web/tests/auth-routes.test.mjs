import assert from "node:assert/strict";

const base = process.env.AUTH_TEST_BASE_URL || "http://localhost:3100";
const routes = ["/", "/pedidos", "/stock", "/ventas", "/compras", "/produccion", "/tesoreria", "/contabilidad", "/reportes", "/reportes/costos", "/maestros", "/administracion", "/personal/horas"];
for (const path of routes) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  assert.equal(response.status, 307, `${path} must reject anonymous access`);
  const destination = new URL(response.headers.get("location"), base);
  assert.equal(destination.pathname, "/login");
  assert.equal(destination.searchParams.get("next"), path);
  assert.match(response.headers.get("cache-control"), /no-store/);
}
const rsc = await fetch(new URL("/reportes/costos?_rsc=test", base), {
  redirect: "manual", headers: { RSC: "1", "Next-Router-Prefetch": "1", Cookie: "sb-yklyjamiyjvydotvqjeg-auth-token=invalid" },
});
assert.equal(rsc.status, 307, "Prefetch and invalid cookies must not bypass login");
const login = await fetch(new URL("/login", base));
assert.equal(login.status, 200);
const html = await login.text();
assert.match(html, /Iniciar sesión/);
assert.doesNotMatch(html, /class="app-frame"/, "Login must not expose module navigation");
console.log(`PASS: ${routes.length} routes, RSC prefetch, invalid session and public login`);
