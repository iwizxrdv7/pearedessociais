import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "P&A Redes Sociais - Postador & Agendador Automático",
  description: "Plataforma profissional de publicação e agendamento automático de vídeos e Reels via API direta da Meta.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-[#0B0F19] text-gray-100 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </body>
    </html>
  );
}
