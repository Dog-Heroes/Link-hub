import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Access control for /admin.
 * ADMIN_ALLOWED_EMAILS: comma-separated emails or @domain patterns.
 * Examples: "mario@dogheroes.com, @dogheroes.com"
 */
const ALLOWED = (process.env.ADMIN_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isEmailAllowed(email: string): boolean {
  if (ALLOWED.length === 0) return true;
  const lower = email.toLowerCase();
  return ALLOWED.some((rule) =>
    rule.startsWith("@") ? lower.endsWith(rule) : lower === rule
  );
}

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
      return isEmailAllowed(profile.email);
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
