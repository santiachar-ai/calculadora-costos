"use client";
import { createContext, useContext } from "react";
export type Membership = { user_id: string; enabled: boolean; is_admin: boolean; permissions: string[]; version: number };
export const PermissionsContext = createContext<Membership | null>(null);
export function useAccess(module: string, action = "manage") {
  const member = useContext(PermissionsContext);
  return !!member?.enabled && (member.is_admin || (member.permissions.includes(`${module}:view`) && member.permissions.includes(`${module}:${action}`)));
}
