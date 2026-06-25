import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTurnstileToken } from "@/lib/turnstile";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please fill in both email and password fields.");
        }

        const isHuman = await verifyTurnstileToken(credentials.turnstileToken ?? "");
        if (!isHuman) {
          throw new Error("Security verification failed. Please try again.");
        }

        const cleanEmail = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!user || !user.passwordHash) {
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
    async signIn({ user, account }) {
      if (!account) {
        return true; // Pass through credentials logins safely
      }

      if (account.provider === "google" && user.email) {
        try {
          const cleanEmail = user.email.trim().toLowerCase();
          const existingUser = await prisma.user.findUnique({
            where: { email: cleanEmail },
          });

          const userId = existingUser
            ? existingUser.id
            : (
                await prisma.user.create({
                  data: {
                    email: cleanEmail,
                    name: user.name || "Google User",
                    passwordHash: "",
                    role: "PATIENT",
                  },
                })
              ).id;

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
    async jwt({ token, user }) {
      // 1. Initial execution on successful login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        return token;
      }

      // 2. Background session syncs safety boundary checks
      if (!token || !token.email) {
        return token;
      }

      try {
        const cleanEmail = token.email.trim().toLowerCase();
        const dbUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
          select: { id: true, role: true }
        });
        
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      } catch (dbError) {
        console.error("NextAuth JWT Database Lookup Error:", dbError);
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
    // Receiving and clicking a Magic Link proves inbox ownership exactly like
    // our own /verify-email flow does — so a successful passwordless sign-in
    // doubles as email verification for any account that hasn't completed it yet.
    async signIn({ user, account }) {
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
