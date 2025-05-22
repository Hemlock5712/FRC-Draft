import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // Create or update user in Convex
        const userId = await convex.mutation(api.users.upsertUser, {
          name: user.name || undefined,
          email: user.email,
          image: user.image || undefined,
        });

        // Attach the Convex user ID to the session
        user.id = userId as string;
        return true;
      } catch (error) {
        console.error('Error upserting user in Convex:', error);
        return false;
      }
    },
    async session({ session, user }) {
      if (session.user) {
        // Get user from Convex
        const convexUser = await convex.query(api.users.getUserByEmail, {
          email: session.user.email!,
        });

        // Add Convex user ID to session
        session.user.id = convexUser?._id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
}; 