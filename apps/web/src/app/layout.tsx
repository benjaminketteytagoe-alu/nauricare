import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nauricare.org";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    template: "%s | NauriCare",
    default:
      "NauriCare — Secure Telemedicine & Women’s Health Platform in Kigali, Rwanda",
  },

  description:
    "Compassionate, evidence-based telehealth for PCOS, fibroids, and women’s reproductive health. Connect with verified OB-GYN specialists in Kigali and across Africa — securely, from anywhere.",

  keywords: [
    "women’s health Kigali",
    "PCOS specialist Rwanda",
    "telemedicine Rwanda",
    "fibroids treatment Kigali",
    "gynecologist online Africa",
    "reproductive health platform",
    "NauriCare",
  ],

  authors: [{ name: "NauriCare", url: BASE_URL }],
  creator: "NauriCare",
  publisher: "NauriCare",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "NauriCare",
    title: "NauriCare — Secure Telemedicine & Women’s Health Platform",
    description:
      "Your body, understood. Your health, connected. Evidence-based care for PCOS, fibroids, and reproductive health with verified specialists across Africa.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NauriCare — Women’s Health Platform",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@NauriCare",
    creator: "@NauriCare",
    title: "NauriCare — Secure Telemedicine & Women’s Health",
    description:
      "Evidence-based care for PCOS, fibroids, and reproductive health. Connect with verified specialists in Kigali and across Africa.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
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
