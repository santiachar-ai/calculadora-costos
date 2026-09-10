import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function requirePermission(module: string, action: string) {
  const jar=await cookies();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Supabase no está configurado");
  const client=createServerClient(url,key,{cookies:{getAll:()=>jar.getAll(),setAll:()=>{}}});
  const {data,error}=await client.rpc("erp_can",{p_module:module,p_action:action});
  if(error||data!==true)throw new Error("No tenés permiso para esta operación");
}
