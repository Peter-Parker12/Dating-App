"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n, type Key } from "@/lib/i18n";

export default function Nav() {
  const { me, logout } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const path = usePathname();

  const links: { href: string; label: Key; show: boolean }[] = [
    { href: "/", label: "nav.home", show: true },
    { href: "/explore", label: "nav.explore", show: true },
    { href: "/bookings", label: "nav.bookings", show: !!me },
    { href: "/saved", label: "nav.saved", show: me?.role === "CUSTOMER" },
    { href: "/talent", label: "nav.talent", show: me?.role === "TALENT" },
    { href: "/admin", label: "nav.admin", show: me?.role === "ADMIN" },
    { href: "/safety", label: "nav.safety", show: true },
    { href: "/profile", label: "nav.profile", show: !!me },
  ];
  const visible = links.filter((l) => l.show);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-rose-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link href="/" className="text-lg font-extrabold text-brand-600">♥ {t("brand")}</Link>
          <nav className="ml-4 hidden gap-1 md:flex">
            {visible.map((l) => (
              <Link key={l.href} href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${active(l.href) ? "bg-brand-100 text-brand-700" : "text-slate-600 hover:bg-brand-50"}`}>
                {t(l.label)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setLocale(locale === "vi" ? "en" : "vi")} aria-label="Switch language"
              className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-brand-700">
              {locale === "vi" ? "EN" : "VI"}
            </button>
            {me ? (
              <button onClick={() => void logout()} className="btn-ghost !px-3 !py-1.5">{t("nav.logout")}</button>
            ) : (
              <>
                <Link href="/login" className="btn-ghost !px-3 !py-1.5">{t("nav.login")}</Link>
                <Link href="/register" className="btn-primary !px-3 !py-1.5">{t("nav.register")}</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-rose-100 bg-white md:hidden">
        {visible.slice(0, 5).map((l) => (
          <Link key={l.href} href={l.href}
            className={`flex-1 py-3 text-center text-xs font-semibold ${active(l.href) ? "text-brand-600" : "text-slate-500"}`}>
            {t(l.label)}
          </Link>
        ))}
      </nav>
    </>
  );
}
