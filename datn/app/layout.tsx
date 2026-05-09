import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: "TownHub Management",
  description: "Hệ thống quản lý TownHub",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-amber-500/30 selection:text-amber-200">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}