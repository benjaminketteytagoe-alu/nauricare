import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please fill in both email and password fields.");
        }

        const cleanEmail = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (!user || !user.passwordHash) {
          throw new Error("No user records correspond with this address.");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValidPassword) {
          throw new Error("Invalid password submission.");
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
          
          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: cleanEmail,
                name: user.name || "Google User",
                passwordHash: "", 
                role: "PATIENT",
              },
            });
          }
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
