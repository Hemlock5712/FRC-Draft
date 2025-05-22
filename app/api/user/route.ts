import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
// import prisma from '../../../lib/prisma'; // Prisma import removed
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      const user = await convex.query(api.users.getUserByEmail, { email: session.user.email });

      if (!user) {
        return NextResponse.json(
          { message: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(user);
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Failed to fetch user';
      const errorStatus = error.data?.status || 500;
      console.error('Convex error fetching user:', error.data || error);
      return NextResponse.json({ message: errorMessage }, { status: errorStatus });
    }

  } catch (error) {
    console.error('Outer error in user route:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 