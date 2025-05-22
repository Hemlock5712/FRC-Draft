import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Create a Convex HTTP client for server-side API routes
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Call Convex query to get user's draft rooms
    const result = await convex.query(api.draftRooms.listUserDraftRooms, {
      userId: session.user.id
    });
    
    // Check for empty or invalid result
    if (!result || !result.activeRooms) {
      return NextResponse.json({ activeRooms: [] });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch draft rooms:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft rooms' },
      { status: 500 }
    );
  }
}
