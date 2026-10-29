import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import SosButton from "@/components/SosButton";

export const metadata: Metadata = {
  title: "Cùng Đi",
  description: "Book a verified companion for coffee, study sessions and events.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#e11d48", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <I18nProvider>
          <AuthProvider>
            <Nav />
            <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:pb-10">{children}</main>
            <SosButton />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
