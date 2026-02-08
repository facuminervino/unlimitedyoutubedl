import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Descargador de YouTube",
  description: "Descargador de videos de YouTube sin publicidad ni limites",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
