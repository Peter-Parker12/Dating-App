"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isApproved, useAuth } from "./auth";

export function useRequireAuth(role?: "CUSTOMER" | "TALENT" | "ADMIN", opts: { approved?: boolean } = {}) {
  const { me, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/login");
    else if (role && me.role !== role) router.replace("/");
    else if (opts.approved && !isApproved(me)) router.replace("/verify");
  }, [me, loading, role, router, opts.approved]);
  return { me: me && (!role || me.role === role) && (!opts.approved || isApproved(me)) ? me : null, loading };
}
