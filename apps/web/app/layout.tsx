import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP Propio",
  description: "Panel operativo para validar stock y remitos multi-deposito",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
