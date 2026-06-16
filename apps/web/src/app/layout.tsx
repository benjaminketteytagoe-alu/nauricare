import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "NauriCare | Women's Health & Specialist Guidance",
  description: "Your trusted companion for women’s health, providing guidance for PCOS, fibroids, and related conditions.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

// viewportFit "cover" lets content extend under the iOS notch / home indicator
// so that env(safe-area-inset-*) reports real values instead of 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
