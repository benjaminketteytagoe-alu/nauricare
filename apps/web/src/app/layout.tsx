import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
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
      {/* We removed inter.className and added font-sans */}
      <body className="font-sans min-h-screen bg-gray-50 flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-grow">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 py-8 mt-auto text-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} NauriCare. Built for women in Africa.</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
