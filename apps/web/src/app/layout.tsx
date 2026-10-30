import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import Nav from "@/components/Nav";
import SosButton from "@/components/SosButton";
import Footer from "@/components/Footer";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&family=Dancing+Script:wght@600;700&display=swap&subset=vietnamese"
        />
      </head>
      <body>
        <I18nProvider>
          <AuthProvider>
            <Nav />
            <main className="page-enter mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6">{children}</main>
            <Footer />
            <SosButton />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
