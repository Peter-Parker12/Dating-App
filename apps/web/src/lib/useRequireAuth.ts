"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth";

export function useRequireAuth(role?: "CUSTOMER" | "TALENT" | "ADMIN") {
  const { me, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/login");
    else if (role && me.role !== role) router.replace("/");
  }, [me, loading, role, router]);
  return { me: me && (!role || me.role === role) ? me : null, loading };
}
