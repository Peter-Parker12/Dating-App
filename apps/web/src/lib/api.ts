export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "error");
  return data as T;
}

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export interface Talent {
  id: string; displayName: string; gender: string; age: number; bio: string; heightCm: number | null;
  style: string; languages: string[]; hourlyPrice: number; photos: string[]; activities: string[];
  availability: string; district: string; sticker: string; availableNow: boolean; verified: boolean;
}
export interface Activity { slug: string; nameVi: string; nameEn: string }
export interface Booking {
  id: string; customerId: string; talentId: string; activity: string; date: string; startTime: string;
  hours: number; place: string; note: string; status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  customer: { id: string; name: string };
  talent: { id: string; name: string; talent: { displayName: string } | null };
}
export interface Message { id: string; bookingId: string; senderId: string; body: string; flagged: boolean; createdAt: string }
