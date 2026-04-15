import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Allowed Google emails — only these can access /admin.
 * Add team members here or use a domain allowlist.
 */
const ALLOWED_EMAILS = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ profile }) {
      if (!profile?.email) return false;
      if (ALLOWED_EMAILS.length === 0) return true; // no restriction if empty
      return ALLOWED_EMAILS.includes(profile.email.toLowerCase());
    },
    session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
});
