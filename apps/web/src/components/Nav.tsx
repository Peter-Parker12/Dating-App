"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, Heart, House, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";

export default function Nav() {
  const { me, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const path = usePathname();

  const links: { href: string; label: Key; show: boolean; icon: typeof House }[] = [
    { href: "/", label: "nav.home", show: true, icon: House },
    { href: "/explore", label: "nav.explore", show: true, icon: Compass },
    { href: "/bookings", label: "nav.bookings", show: !!me, icon: CalendarDays },
    { href: "/saved", label: "nav.saved", show: me?.role === "CUSTOMER", icon: Heart },
    { href: "/talent", label: "nav.talent", show: me?.role === "TALENT", icon: User },
    { href: "/admin", label: "nav.admin", show: me?.role === "ADMIN", icon: ShieldCheck },
    { href: "/safety", label: "nav.safety", show: true, icon: ShieldCheck },
    { href: "/profile", label: "nav.profile", show: !!me, icon: User },
  ];
  const visible = links.filter((l) => l.show);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-3 px-4 md:gap-5 md:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-grad-primary text-white shadow-[0_6px_16px_rgba(244,63,122,.35),inset_0_-3px_0_rgba(0,0,0,.08)]">
              <Heart size={20} fill="currentColor" />
            </span>
            <span className="hidden text-xl font-black tracking-tight text-ink sm:inline">{t("brand")}</span>
          </Link>
          <nav className="ml-2 hidden gap-1.5 md:flex">
            {visible.map((l) => (
              <Link key={l.href} href={l.href}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${active(l.href) ? "bg-brand-100 text-brand-600" : "text-muted hover:bg-brand-50 hover:text-brand-600"}`}>
                {t(l.label)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setLocale(locale === "vi" ? "en" : "vi")} aria-label="Switch language"
              className="rounded-full border border-line-strong bg-brand-50 px-3 py-1.5 text-xs font-extrabold text-brand-600 hover:bg-brand-100">
              {locale === "vi" ? "EN" : "VI"}
            </button>
            {me ? (
              <button onClick={() => void logout()} className="btn-ghost !px-3.5 !py-2">{t("nav.logout")}</button>
            ) : (
              <>
                <Link href="/login" className="btn-ghost !px-3.5 !py-2">{t("nav.login")}</Link>
                <Link href="/register" className="btn-primary !px-3.5 !py-2">{t("nav.register")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {visible.slice(0, 5).map((l) => (
          <Link key={l.href} href={l.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active(l.href) ? "text-brand-600" : "text-muted"}`}>
            <l.icon size={20} />
            {t(l.label)}
          </Link>
        ))}
      </nav>
    </>
  );
}
