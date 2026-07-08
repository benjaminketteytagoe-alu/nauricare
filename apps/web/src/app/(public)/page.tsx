import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nauricare.org";

// Page-level metadata inherits the root template: "NauriCare — Women's Health, Connected | NauriCare"
// The title.template in layout.tsx appends " | NauriCare" automatically.
export const metadata: Metadata = {
  title: "NauriCare — Women's Health, Connected",
  description:
    "Compassionate, evidence-based care for PCOS, fibroids, and women's reproductive health. Connect with verified specialists in Kigali, Rwanda, track your health journey, and access 24/7 AI-powered guidance.",
  openGraph: {
    title: "NauriCare — Women's Health, Connected",
    description:
      "Compassionate telehealth for PCOS, fibroids, and reproductive health. Verified OB-GYN specialists serving Kigali and across Africa.",
    type: "website",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "NauriCare — Women's Health, Connected",
    description:
      "Compassionate telehealth for PCOS, fibroids, and reproductive health. Verified specialists across Africa.",
  },
};

// MedicalOrganization JSON-LD — grounded for local Kigali / Rwanda entity signals
// and AI generative engine discovery (AEO / GEO).
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  name: "NauriCare",
  alternateName: "NauriCare Women's Health Platform",
  url: BASE_URL,
  logo: `${BASE_URL}/logo-horizontal.jpg`,
  description:
    "NauriCare is a secure telehealth platform providing evidence-based women's reproductive health care — specialising in PCOS, uterine fibroids, and menstrual health — with verified OB-GYN specialists serving patients in Kigali, Rwanda, and across Africa.",
  medicalSpecialty: [
    "Gynecology",
    "ObstetricsAndGynecology",
    "ReproductiveMedicine",
  ],
  availableService: [
    {
      "@type": "MedicalTherapy",
      name: "Virtual Gynaecology Consultations",
      description:
        "Secure end-to-end encrypted video consultations with verified OB-GYN specialists.",
    },
    {
      "@type": "MedicalTherapy",
      name: "PCOS Management",
      description:
        "Personalised, evidence-based care plans for polycystic ovary syndrome.",
    },
    {
      "@type": "MedicalTherapy",
      name: "Fibroid Assessment & Monitoring",
      description:
        "Remote assessment and ongoing monitoring for uterine fibroids with specialist guidance.",
    },
    {
      "@type": "MedicalTherapy",
      name: "Menstrual Health Tracking",
      description:
        "AI-powered cycle tracking and predictive health insights for women's reproductive wellness.",
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kigali",
    addressRegion: "Kigali Province",
    addressCountry: "RW",
  },
  areaServed: [
    {
      "@type": "City",
      name: "Kigali",
    },
    {
      "@type": "Country",
      name: "Rwanda",
    },
    {
      "@type": "Continent",
      name: "Africa",
    },
  ],
  geo: {
    "@type": "GeoCoordinates",
    latitude: -1.9441,
    longitude: 30.0619,
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@nauricare.org",
    availableLanguage: ["en"],
  },
  founder: {
    "@type": "Person",
    name: "NauriCare Team",
  },
  knowsAbout: [
    "Polycystic Ovary Syndrome",
    "Uterine Fibroids",
    "Reproductive Health",
    "Women's Telehealth",
    "Menstrual Health",
    "Hormonal Health",
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageClient />
    </>
  );
}
