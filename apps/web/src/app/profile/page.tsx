"use client";
import Link from "next/link";
import { useI18n, type Key } from "@/lib/i18n";
import { useRequireAuth } from "@/lib/useRequireAuth";

const STATUS_KEY: Record<string, Key> = {
  PENDING: "kyc.banner.PENDING", IN_REVIEW: "verify.inReview", APPROVED: "verify.approved", REJECTED: "verify.rejected",
};

export default function Profile() {
  const { t } = useI18n();
  const { me } = useRequireAuth();
  if (!me) return <p>{t("common.loading")}</p>;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
      <div className="card space-y-1 text-sm">
        <div className="font-bold">{me.name}</div>
        <div className="text-muted">{me.email}</div>
        {me.phone && <div><span className="text-muted">{t("profile.phone")}:</span> {me.phone}</div>}
        {me.addressLine && <div><span className="text-muted">{t("profile.address")}:</span> {[me.addressLine, me.ward, me.province].filter(Boolean).join(", ")}</div>}
        <div className="pt-1 text-xs text-muted">{t("profile.private")}</div>
      </div>
      {me.role !== "ADMIN" && (
        <div className="card space-y-2">
          <h2 className="font-bold">{t("profile.kycStatus")}</h2>
          <p className="text-sm">{t(STATUS_KEY[me.kycStatus])}</p>
          {me.kycStatus === "REJECTED" && me.kycRejectReason && <p className="text-sm text-red-600"><b>{t("kyc.reason")}:</b> {me.kycRejectReason}</p>}
          {me.kycStatus !== "APPROVED" && <Link href="/verify" className="btn-primary">{t("profile.openVerify")}</Link>}
        </div>
      )}
    </div>
  );
}
