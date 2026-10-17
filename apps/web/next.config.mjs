/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// ─── Content Security Policy ─────────────────────────────────────────────────
// Every third-party origin the app talks to is listed here, and nothing else.
// 'unsafe-inline' for scripts follows Next.js's documented "without nonces"
// setup: App Router emits inline bootstrap scripts, and a nonce-based policy
// would force every public page to render dynamically. All other XSS layers
// still apply (React escaping, server-side tag stripping, strict origins,
// no plugins, no base-tag hijack, no framing).
const S3_HOSTS = "https://*.amazonaws.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://picsum.photos https://avatars.githubusercontent.com https://lh3.googleusercontent.com ${S3_HOSTS}`,
  `media-src 'self' blob: https://res.cloudinary.com ${S3_HOSTS}`,
  "font-src 'self' data:",
  // Browser → API, Turnstile, and direct-to-S3 presigned uploads. Jitsi's
  // WebRTC/WebSocket traffic runs inside its own iframe origin.
  `connect-src 'self' https://challenges.cloudflare.com ${S3_HOSTS}${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://meet.jit.si https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // Google OAuth redirects from the sign-in form submission.
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: one image serves both staging (plain HTTP
  // on :3001) and production; HSTS below enforces HTTPS on the real domain.
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Default: no sensitive device access anywhere.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), display-capture=(), payment=(), usb=()" },
];

// Consultation rooms embed Jitsi, which needs camera, mic and screen share.
// Same header key as above: Next.js applies the LAST matching entry.
const CONSULTATION_PERMISSIONS = {
  key: "Permissions-Policy",
  value: 'camera=(self "https://meet.jit.si"), microphone=(self "https://meet.jit.si"), display-capture=(self "https://meet.jit.si"), fullscreen=(self "https://meet.jit.si"), geolocation=(), payment=(), usb=()',
};

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,

  // Trust Cloudflare proxy headers for accurate client IP in rate-limiting and audit logs.
  // CF-Connecting-IP is set by Cloudflare; X-Forwarded-For is the fallback.
  // Next.js does not expose an Express-style trust proxy setting, so IP extraction
  // is done explicitly per route handler (see src/lib/getClientIp.ts).

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

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/dashboard/telehealth/:path*", headers: [CONSULTATION_PERMISSIONS] },
    ];
  },
};

export default nextConfig;
