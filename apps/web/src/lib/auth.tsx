"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";

export interface Me {
  id: string; email: string; name: string; role: "CUSTOMER" | "TALENT" | "ADMIN" | "MODERATOR"; gender: string | null; locale: string;
  kycStatus: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  emailVerified: boolean; phoneVerified: boolean; hasId: boolean; hasStudentCard: boolean; hasProfileImage: boolean;
  kycRejectReason: string | null;
  phone: string | null; province: string | null; ward: string | null; addressLine: string | null;
  talent: null | {
    displayName: string; gender: string; age: number; bio: string; heightCm: number | null; style: string;
    languages: string[]; hourlyPrice: number; activities: string[]; availability: string; district: string; sticker: string; availableNow: boolean; published: boolean;
  };
}

interface Ctx { me: Me | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ me: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setMe(await api<Me>("/me")); } catch { setMe(null); }
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const logout = useCallback(async () => { await api("/auth/logout", { method: "POST" }); setMe(null); }, []);
  return <AuthCtx.Provider value={{ me, loading, refresh, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

/** Admins and moderators review other people's verification. */
export const isStaffRole = (role: Me["role"]) => role === "ADMIN" || role === "MODERATOR";

/** Staff are exempt from KYC; everyone else must be approved to act. */
export const isApproved = (me: Me | null) => !!me && (isStaffRole(me.role) || me.kycStatus === "APPROVED");
