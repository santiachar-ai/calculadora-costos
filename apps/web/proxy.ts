import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { moduleForPath } from "./lib/permission-map";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") return NextResponse.next();
  let response = NextResponse.next({ request });
  const deny = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return deny();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return deny();
    const { data: member, error: memberError } = await client.from("erp_members")
      .select("enabled,is_admin,permissions").eq("user_id", user.id).eq("enabled", true).maybeSingle();
    if (memberError || !member) return deny();
    if (request.nextUrl.pathname !== "/sin-acceso" && !member.is_admin && !member.permissions?.includes(`${moduleForPath(request.nextUrl.pathname)}:view`)) {
      const destination=request.nextUrl.clone(); destination.pathname="/sin-acceso";destination.search="";
      const rejected=NextResponse.redirect(destination);response.cookies.getAll().forEach(c=>rejected.cookies.set(c));
      rejected.headers.set("Cache-Control","private, no-store");return rejected;
    }
  } catch {
    return deny();
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
