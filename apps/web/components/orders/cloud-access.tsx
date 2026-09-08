"use client";
import { ReactNode, useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase/client";
export function CloudAccess({children}:{children:ReactNode}) {
 const [user,setUser]=useState<string|null>(null),[loading,setLoading]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const client=getSupabase();
 useEffect(()=>{if(!client){setLoading(false);return;}let alive=true;client.auth.getSession().then(({data,error})=>{if(alive){setUser(data.session?.user.id??null);setLoading(false);if(error)setError(error.message);}});const {data}=client.auth.onAuthStateChange((_event,session)=>{if(alive){setUser(session?.user.id??null);setLoading(false);}});return()=>{alive=false;data.subscription.unsubscribe();};},[client]);
 if(!client)return <section className="page-shell"><div className="panel"><h1>Pedidos compartidos</h1><p>La conexión con Supabase todavía no está configurada. Los datos anteriores del navegador se conservan.</p></div></section>;
 if(loading)return <p role="status">Verificando sesión…</p>;
 if(!user)return <section className="page-shell"><form className="form-card" onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");try{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;setPassword("");}catch(e){setError(e instanceof Error?e.message:"No se pudo iniciar sesión");}finally{setBusy(false);}}}><h1>Ingresar a Pedidos</h1><p>Usá la cuenta habilitada para el ERP. Podés acceder a los mismos pedidos desde ambas PCs.</p><label className="field">Correo<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="button" disabled={busy}>{busy?"Ingresando…":"Ingresar"}</button></form></section>;
 return <><div className="page-shell"><button className="button-secondary" onClick={async()=>{const {error}=await client.auth.signOut();if(error)setError(error.message);}}>Cerrar sesión</button>{error&&<p role="alert">{error}</p>}</div><div key={user}>{children}</div></>;
}
