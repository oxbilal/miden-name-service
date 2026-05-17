import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Miden Name Service",
  description: "Frontend MVP for mock .miden name search and registration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
