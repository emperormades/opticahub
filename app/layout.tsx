import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Rupta OS — Gestão Óptica de Alta Performance",
  description:
    "Sistema de gerenciamento completo para óticas. Prontuário óptico, ordens de serviço, financeiro e inteligência artificial em uma plataforma integrada.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
