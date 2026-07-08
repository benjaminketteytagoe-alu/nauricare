import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://nauricare.org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/provider", "/admin", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
