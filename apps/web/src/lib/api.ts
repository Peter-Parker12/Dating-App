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
  if (!res.ok) throw failure(res.status, data);
  return data as T;
}

/** Unapproved accounts are sent to the verification page whenever the API refuses an action. */
function failure(status: number, data: unknown): ApiError {
  const code = (data as { error?: string }).error ?? "error";
  if (status === 403 && code === "kyc_required" && typeof window !== "undefined" && !window.location.pathname.startsWith("/verify"))
    window.location.assign("/verify");
  return new ApiError(status, code);
}

export async function apiForm<T = unknown>(path: string, body: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, { method: "POST", body, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw failure(res.status, data);
  return data as T;
}

export const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export interface Talent {
  id: string; displayName: string; gender: string; age: number; bio: string; heightCm: number | null;
  style: string; languages: string[]; hourlyPrice: number; photos: string[]; activities: string[];
  availability: string; district: string; sticker: string; availableNow: boolean; ratingAvg: number; ratingCount: number; verified: boolean;
}
export interface Activity { slug: string; nameVi: string; nameEn: string }
export interface Booking {
  id: string; customerId: string; talentId: string; activity: string; date: string; startTime: string;
  hours: number; place: string; note: string; status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "COMPLETED";
  review: { id: string; rating: number; comment: string; createdAt: string } | null;
  customer: { id: string; name: string };
  talent: { id: string; name: string; talent: { displayName: string } | null };
}
export interface Message { id: string; bookingId: string; senderId: string; body: string; flagged: boolean; createdAt: string }
export interface ReviewItem {
  id: string; rating: number; comment: string; reply: string | null; repliedAt: string | null; createdAt: string; author: string;
}
export interface ReviewSummary { avg: number; count: number; breakdown: number[]; reviews: ReviewItem[] }
export interface Notice { id: string; type: string; data: Record<string, string> | null; readAt: string | null; createdAt: string }
