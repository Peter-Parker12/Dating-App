import type { KycStatus, Role, UserStatus } from "@prisma/client";
import { isStaff, mayAct } from "./kycRules.js";

export const GALLERY_MAX = 6;

export interface PhotoViewer { id: string; role: Role; kyc: KycStatus }
export interface PhotoSubject { hidden: boolean; owner: { id: string; role: Role; status: UserStatus; kyc: KycStatus } }

export type PhotoAccess = "allow" | "login_required" | "hidden";

/**
 * Who can see a photo:
 *  - the owner and staff (admins, moderators) always can, even if it was removed;
 *  - nobody else can see a removed photo, or any photo of an account that is suspended or not approved;
 *  - a talent's photos are public (the listing is public);
 *  - anyone else's photos (customers) are visible only to logged-in, approved users.
 */
export function photoAccess(viewer: PhotoViewer | null, photo: PhotoSubject): PhotoAccess {
  if (viewer && (viewer.id === photo.owner.id || isStaff(viewer.role))) return "allow";
  if (photo.hidden) return "hidden";
  if (photo.owner.status !== "ACTIVE" || photo.owner.kyc !== "APPROVED") return "hidden";
  if (photo.owner.role === "TALENT") return "allow";
  if (!viewer) return "login_required";
  return mayAct(viewer.role, viewer.kyc) ? "allow" : "hidden";
}

export const canAddGallery = (currentCount: number): boolean => currentCount < GALLERY_MAX;

/** Profile photo first, then the gallery in upload order. */
export function orderPhotos<T extends { kind: "PROFILE" | "GALLERY"; createdAt: Date }>(photos: T[]): T[] {
  return [...photos].sort((a, b) => (a.kind === b.kind ? a.createdAt.getTime() - b.createdAt.getTime() : a.kind === "PROFILE" ? -1 : 1));
}
