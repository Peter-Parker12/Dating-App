"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isApproved, useAuth } from "./auth";

type Role = "CUSTOMER" | "TALENT" | "ADMIN" | "MODERATOR";

export function useRequireAuth(roleOrRoles?: Role | Role[], opts: { approved?: boolean } = {}) {
  const { me, loading } = useAuth();
  const roles = roleOrRoles === undefined ? null : Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  const rolesKey = roles?.join(",") ?? "";
  const roleOk = !!me && (!roles || roles.includes(me.role));
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/login");
    else if (!roleOk) router.replace("/");
    else if (opts.approved && !isApproved(me)) router.replace("/verify");
  }, [me, loading, roleOk, rolesKey, router, opts.approved]);
  return { me: me && roleOk && (!opts.approved || isApproved(me)) ? me : null, loading };
}
