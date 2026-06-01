import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} min-h-screen bg-gray-50 flex flex-col`}>
        <Providers> {/* Added wrapper */}
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
