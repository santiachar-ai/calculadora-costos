import type { Metadata } from "next";
import { AppSidebar } from "../components/app-sidebar";
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
        <div className="app-frame">
          <AppSidebar />
          <div className="app-content">
            <header className="topbar">
              <div>
                <div className="topbar-title">Panel ERP</div>
                <div className="topbar-subtitle">
                  Base operativa inspirada en la estructura real de tu empresa
                </div>
              </div>
            </header>
            <div className="content-scroll">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
