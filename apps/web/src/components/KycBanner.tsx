"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { isApproved, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

/** Shown to every non-admin account until an admin approves their verification. */
export default function KycBanner() {
  const { me } = useAuth();
  const { t } = useI18n();
  const path = usePathname();
  if (!me || isApproved(me) || path.startsWith("/verify")) return null;

  const inReview = me.kycStatus === "IN_REVIEW";
  const rejected = me.kycStatus === "REJECTED";
  return (
    <div className={`border-b ${rejected ? "border-red-200 bg-red-50" : "border-line-strong bg-brand-100"}`} role="status">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm md:px-6">
        {inReview ? <ShieldCheck size={18} className="shrink-0 text-brand-600" /> : <ShieldAlert size={18} className={`shrink-0 ${rejected ? "text-red-600" : "text-brand-600"}`} />}
        <p className="min-w-0 flex-1 text-ink">
          {t(`kyc.banner.${me.kycStatus}` as "kyc.banner.PENDING")}
          {rejected && me.kycRejectReason && <> <b>{t("kyc.reason")}:</b> {me.kycRejectReason}</>}
        </p>
        <Link href="/verify" className="btn-primary !px-4 !py-1.5">{inReview ? t("kyc.view") : t("kyc.cta")}</Link>
      </div>
    </div>
  );
}
