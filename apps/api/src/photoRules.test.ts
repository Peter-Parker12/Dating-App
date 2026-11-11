import { describe, expect, it } from "vitest";
import { canAddGallery, GALLERY_MAX, orderPhotos, photoAccess, type PhotoSubject, type PhotoViewer } from "./photoRules.js";

const owner = (role: "TALENT" | "CUSTOMER", over: Partial<PhotoSubject["owner"]> = {}) => ({ id: "o", role, status: "ACTIVE" as const, kyc: "APPROVED" as const, ...over });
const photo = (role: "TALENT" | "CUSTOMER", hidden = false, over: Partial<PhotoSubject["owner"]> = {}): PhotoSubject => ({ hidden, owner: owner(role, over) });
const viewer = (role: PhotoViewer["role"], kyc: PhotoViewer["kyc"] = "APPROVED", id = "v"): PhotoViewer => ({ id, role, kyc });

describe("photoAccess", () => {
  it("talent photos are public, customer photos need a logged-in approved user", () => {
    expect(photoAccess(null, photo("TALENT"))).toBe("allow");
    expect(photoAccess(null, photo("CUSTOMER"))).toBe("login_required");
    expect(photoAccess(viewer("TALENT"), photo("CUSTOMER"))).toBe("allow");
    expect(photoAccess(viewer("CUSTOMER"), photo("CUSTOMER"))).toBe("allow");
    expect(photoAccess(viewer("CUSTOMER", "PENDING"), photo("CUSTOMER"))).toBe("hidden");
    expect(photoAccess(viewer("CUSTOMER", "IN_REVIEW"), photo("CUSTOMER"))).toBe("hidden");
  });
  it("removed photos and photos of unapproved or suspended accounts are hidden from everyone else", () => {
    expect(photoAccess(null, photo("TALENT", true))).toBe("hidden");
    expect(photoAccess(viewer("CUSTOMER"), photo("TALENT", true))).toBe("hidden");
    expect(photoAccess(null, photo("TALENT", false, { kyc: "IN_REVIEW" }))).toBe("hidden");
    expect(photoAccess(null, photo("TALENT", false, { kyc: "PENDING" }))).toBe("hidden");
    expect(photoAccess(null, photo("TALENT", false, { status: "SUSPENDED" }))).toBe("hidden");
  });
  it("the owner and staff always see it, even when removed or unapproved", () => {
    expect(photoAccess(viewer("TALENT", "PENDING", "o"), photo("TALENT", true, { kyc: "PENDING" }))).toBe("allow");
    expect(photoAccess(viewer("MODERATOR"), photo("TALENT", true))).toBe("allow");
    expect(photoAccess(viewer("ADMIN"), photo("CUSTOMER", true, { status: "SUSPENDED" }))).toBe("allow");
  });
});

describe("gallery limits and ordering", () => {
  it("allows up to six gallery photos", () => {
    expect(GALLERY_MAX).toBe(6);
    expect(canAddGallery(5)).toBe(true);
    expect(canAddGallery(6)).toBe(false);
  });
  it("puts the profile photo first, then the gallery in upload order", () => {
    const t = (n: number) => new Date(2030, 0, n);
    const ordered = orderPhotos([
      { id: "g2", kind: "GALLERY" as const, createdAt: t(3) }, { id: "p", kind: "PROFILE" as const, createdAt: t(9) }, { id: "g1", kind: "GALLERY" as const, createdAt: t(1) },
    ]);
    expect(ordered.map((x) => x.id)).toEqual(["p", "g1", "g2"]);
  });
});
