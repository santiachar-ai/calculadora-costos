"use client";

import { useEffect, useState } from "react";

import { Order } from "./types";

import { emitNote } from "../../lib/supabase/orders";

export function OrderDelivery({order,busy,setBusy,onSaved}:{order:Order;busy:boolean;setBusy:(v:boolean)=>void;onSaved:()=>Promise<void>}) {

 const [items,setItems]=useState<{id:string;cantidad:number}[]|null>(null),[date,setDate]=useState(order.fechaEntrega),[error,setError]=useState("");

 useEffect(()=>{setItems(null);},[order.version]);
 const sent=(id:string)=>order.deliveryNotes.flatMap(n=>n.payload.items).filter(i=>i.id===id).reduce((s,i)=>s+Number(i.cantidad),0);

 const pending=(id:string)=>Math.max(0,Number(order.items.find(i=>i.id===id)?.cantidad??0)-sent(id));

 return <div style={{width:"100%"}}><div className="table-wrap"><table><thead><tr><th>Artículo</th><th>Remitido</th><th>{order.estado==="CANCELADO"?"Saldo cancelado":"Pendiente"}</th></tr></thead><tbody>{order.items.map(i=><tr key={i.id}><td>{i.articulo}</td><td>{sent(i.id)} {i.unidad}</td><td>{pending(i.id)} {i.unidad}</td></tr>)}</tbody></table></div>

 <button className="button" disabled={busy||!["CONFIRMADO","PREPARACION","PARCIAL"].includes(order.estado)} onClick={()=>{setItems(order.items.map(i=>({id:i.id,cantidad:pending(i.id)})).filter(i=>i.cantidad>0));setError("");}}>Preparar remito</button>

 {items&&<form className="panel" onSubmit={async e=>{e.preventDefault();if(busy||!window.confirm("¿Confirmar y emitir el remito con las cantidades indicadas? El documento conservará los datos de esta entrega."))return;setBusy(true);setError("");try{await emitNote(order,items.filter(i=>i.cantidad>0),date);setItems(null);await onSaved();}catch(e){setError(e instanceof Error?e.message:"No se pudo emitir el remito");}finally{setBusy(false);}}}><h3>Confirmar entrega</h3><p>{order.cliente} · {order.transporte} · {order.patente}</p><p>Se propone entregar todo lo pendiente. Reducí cantidades para una entrega parcial o usá cero para omitir un artículo.</p><fieldset disabled={busy} style={{border:0,padding:0}}><label className="field">Fecha del remito<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>{items.map((i,index)=><label key={i.id} className="field">{order.items.find(x=>x.id===i.id)?.articulo}<input required type="number" min="0" max={pending(i.id)} step="any" value={i.cantidad} onChange={e=>setItems(items.map((x,j)=>j===index?{...x,cantidad:Number(e.target.value)}:x))}/></label>)}<button className="button" disabled={!items.some(i=>i.cantidad>0)}>Confirmar y emitir</button><button type="button" className="button-secondary" onClick={()=>setItems(null)}>Volver sin emitir</button></fieldset>{error&&<p role="alert">{error}</p>}</form>}

 {order.deliveryNotes.map(n=><details key={n.id} className="panel"><summary>{n.numero} · {n.payload.fechaRemito}</summary><p>{n.payload.cliente} · {n.payload.transporte} · {n.payload.chofer} · {n.payload.patente}</p>{n.payload.items.map(i=><p key={i.id}>{i.articulo}: {i.cantidad} {i.unidad}</p>)}</details>)}

 </div>;

}

