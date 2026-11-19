import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/getClientIp";
import { recordPatientActivity } from "@/server/activity/activity.service";
import { rateLimit } from "@/lib/rateLimit";
import { isGooglePhoto } from "@/lib/avatars";
import { randomToken } from "@/server/security/sealing";
import { consumeVerifiedLogin } from "@/server/auth/loginCode.service";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // Magic Link sign-in. The real Turnstile-gated send path is
    // POST /api/auth/magic-link, which creates its own VerificationToken row
    // and emails it directly — bypassing this provider's own send pipeline
    // entirely. sendVerificationRequest below is therefore a deliberate no-op:
    // NextAuth still exposes a native /api/auth/signin/email route the moment
    // this provider is registered, and without disabling the send here, that
    // route would be a way to trigger real emails with zero bot protection.
    // The actual link verification (/api/auth/callback/email) is untouched and
    // still works normally for links our custom route sends.
    EmailProvider({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async sendVerificationRequest(_params) {
        console.warn("[MAGIC_LINK] Native NextAuth send path called — ignored. Use /api/auth/magic-link.");
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile Token", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please fill in both email and password fields.");
        }

        // Per-IP burst limit (5/min) stops one client spraying many accounts;
        // the per-email limit below stops many clients targeting one account.
        const ip = getClientIp(new Headers((req?.headers ?? {}) as Record<string, string>));
        const ipLimit = rateLimit(`auth-login-ip:${ip}`, 5, 60_000);
        if (!ipLimit.allowed) {
          throw new Error("Too many login attempts. Please wait a minute and try again.");
        }

        // Brute-force guard: cap login attempts per email, independent of
        // Turnstile (a solved token doesn't limit how many passwords get tried).
        const loginLimit = rateLimit(`auth-login:${credentials.email.trim().toLowerCase()}`, 10, 15 * 60_000);
        if (!loginLimit.allowed) {
          throw new Error("Too many login attempts. Please try again in a few minutes.");
        }

        const isHuman = await verifyTurnstileToken(credentials.turnstileToken ?? "");
        if (!isHuman) {
          throw new Error("Security verification failed. Please try again.");
        }

        const cleanEmail = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!user || !user.passwordHash || user.deletedAt) {
          throw new Error("No account found with this email.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          throw new Error("Incorrect password. Please try again.");
        }

        if (!user.isEmailVerified) {
          throw new Error("Please verify your email address before logging in.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) {
        return true; // Pass through credentials logins safely
      }

      if (account.provider === "google" && user.email) {
        try {
          const cleanEmail = user.email.trim().toLowerCase();
          const existingUser = await prisma.user.findUnique({
            where: { email: cleanEmail },
            select: { id: true, avatarUrl: true, deletedAt: true },
          });
          if (existingUser?.deletedAt) return false;

          // Google profile photo: the default avatar. It replaces the avatar
          // only while the user hasn't picked a predefined one instead.
          const picture = (profile as { picture?: unknown } | undefined)?.picture ?? user.image;
          const googlePhotoUrl = typeof picture === "string" && isGooglePhoto(picture) ? picture : null;

          const userId = existingUser
            ? existingUser.id
            : (
                await prisma.user.create({
                  data: {
                    email: cleanEmail,
                    name: user.name || "Google User",
                    passwordHash: "",
                    role: "PATIENT",
                    googlePhotoUrl,
                    avatarUrl: googlePhotoUrl,
                  },
                })
              ).id;
          if (existingUser && googlePhotoUrl) {
            const useGooglePhoto = !existingUser.avatarUrl || isGooglePhoto(existingUser.avatarUrl);
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { googlePhotoUrl, ...(useGooglePhoto ? { avatarUrl: googlePhotoUrl } : {}) },
            });
          }

          // Pre-create the adapter's Account link row ourselves. Without this,
          // the adapter's own getUserByAccount() lookup (keyed on provider +
          // providerAccountId, never on email) finds nothing for any user
          // provisioned before this adapter existed, and falls through to
          // createUser() — which collides with the unique email constraint
          // and crashes. Upserting here guarantees a match every time.
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {},
            create: {
              userId,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });
        } catch (dbError) {
          console.error("Error provisioning Google User in DB:", dbError);
          return false; // Reject sign in if DB creation fails completely
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // 1. Initial execution on successful login. Every sign-in starts locked
      // until the emailed 6-digit code is entered (see loginCode.service).
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.mfaVerified = false;
        token.mfaSid = randomToken();
        return token;
      }
      if (!token.mfaSid) token.mfaSid = randomToken(); // sessions from before sign-in codes

      // 1b. Unlock: the client calls update({ loginCode: "verified" }) after
      // /api/auth/code/verify succeeds. The flag is only set if the database
      // holds a verified, unused code for this exact session.
      if (trigger === "update" && (session as { loginCode?: string } | undefined)?.loginCode === "verified" && token.id && !token.mfaVerified) {
        if (await consumeVerifiedLogin(token.id, token.mfaSid)) token.mfaVerified = true;
      }

      // 2. Background session syncs safety boundary checks
      if (!token || !token.email) {
        return token;
      }

      try {
        const cleanEmail = token.email.trim().toLowerCase();
        const dbUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
          select: { id: true, role: true, avatarUrl: true, deletedAt: true }
        });

        if (dbUser && !dbUser.deletedAt) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.avatarUrl = dbUser.avatarUrl;
        } else {
          // Deleted (and anonymised) account: clear the identity so every
          // guard treats this session as signed out.
          token.id = "";
          token.avatarUrl = null;
        }
      } catch (dbError) {
        console.error("NextAuth JWT Database Lookup Error:", dbError);
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Until the sign-in code is verified the session has no user id, so
        // every guard (requireRole, getSessionUser, API routes) rejects it.
        const verified = token.mfaVerified === true;
        session.user.id = verified ? (token.id as string) : "";
        session.user.role = token.role;
        session.user.avatarUrl = verified ? (token.avatarUrl ?? null) : null;
        session.loginCodePending = !verified && !!token.id;
      }
      return session;
    },
  },
  events: {
    // Receiving and clicking a Magic Link proves inbox ownership exactly like
    // our own /verify-email flow does — so a successful passwordless sign-in
    // doubles as email verification for any account that hasn't completed it yet.
    async signIn({ user, account }) {
      if (user?.id) {
        const role = (await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } }))?.role;
        await recordPatientActivity(role, {
          userId: user.id,
          type: "SIGNED_IN",
          title: `Signed in${account?.provider === "google" ? " with Google" : account?.provider === "email" ? " with an email link" : ""}`,
        });
      }
      if (account?.provider === "email" && user?.id) {
        await prisma.user.updateMany({
          where: { id: user.id, isEmailVerified: false },
          data: { isEmailVerified: true },
        });
      }
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", 
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "nauricare_local_development_fallback_secret_key_2026",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
