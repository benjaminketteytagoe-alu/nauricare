/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Trust Cloudflare proxy headers for accurate client IP in rate-limiting and audit logs.
  // CF-Connecting-IP is set by Cloudflare; X-Forwarded-For is the fallback.
  // When this app runs behind Cloudflare, set TRUST_PROXY=1 in the container env
  // and read req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] in API routes.
  // Next.js does not expose an Express-style trust proxy setting, so IP extraction
  // must be done explicitly per route handler (see src/lib/getClientIp.ts).

  images: {
    remotePatterns: [
      // Cloudinary CDN — primary media host for user-uploaded images
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Common placeholder / dev image services
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
