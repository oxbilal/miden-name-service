import type { Metadata } from "next";
import "./globals.css";
import "@demox-labs/miden-wallet-adapter/styles.css";
import { Providers } from "./providers";

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
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
