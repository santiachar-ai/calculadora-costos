"use client";
import { getSupabase } from "./client";
import { DeliveryNote, Order, OrderFormState } from "../../components/orders/types";
function client() { const c=getSupabase(); if(!c)throw new Error("Supabase no está configurado"); return c; }
export async function fetchOrders():Promise<Order[]> {
 const c=client();
 const {data:member,error:memberError}=await c.from("erp_members").select("enabled").eq("enabled",true).limit(1);
 if(memberError)throw new Error(memberError.message);
 if(!member?.length)throw new Error("Tu usuario todavía no está habilitado para el ERP.");
 const {data,error}=await c.from("erp_orders").select("*,erp_delivery_notes(*)").order("created_at",{ascending:false});
 if(error)throw new Error(error.message);
 return (data??[]).map(row=>({...row.payload,id:row.id,numero:`PED-${String(row.number).padStart(8,"0")}`,version:row.version,createdAt:row.created_at,updatedAt:row.updated_at,remitoBorradorId:null,deliveryNotes:row.erp_delivery_notes.map((n:{id:string;number:number;payload:DeliveryNote["payload"];created_at:string})=>({...n,numero:`REM-${String(n.number).padStart(8,"0")}`}))}));
}
export async function persistOrder(form:OrderFormState, previous?:Order) {
 const payload:OrderFormState={cliente:form.cliente.trim(),fechaPedido:form.fechaPedido,fechaEntrega:form.fechaEntrega,transporte:form.transporte.trim(),chofer:form.chofer.trim(),telefono:form.telefono.trim(),documento:form.documento.trim(),licencia:form.licencia.trim(),patente:form.patente.trim().toUpperCase(),observaciones:form.observaciones.trim(),estado:form.estado,items:form.items.map(i=>({...i,articulo:i.articulo.trim(),cantidad:Number(i.cantidad)}))};
 const {data,error}=await client().rpc("erp_save_order",{p_id:previous?.id??null,p_version:previous?.version??null,p_payload:payload});
 if(error)throw new Error(error.message);return data as string;
}
export async function emitNote(order:Order,items:{id:string;cantidad:number}[],date:string) {
 const {data,error}=await client().rpc("erp_issue_note",{p_order_id:order.id,p_version:order.version,p_items:items,p_date:date,p_confirm:true});
 if(error)throw new Error(error.message);return data as string;
}
