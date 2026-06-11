import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "NauriCare | Women's Health & Specialist Guidance",
  description: "Your trusted companion for women’s health, providing guidance for PCOS, fibroids, and related conditions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-gray-50 flex flex-col" suppressHydrationWarning>
        <Providers>
          {/* Global clean workspace canvas container */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
