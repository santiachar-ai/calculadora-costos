"use client";
import { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
let client: SupabaseClient | undefined;
export function getSupabase() {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) return null;
 client ??= createBrowserClient(url,key);
 return client;
}
