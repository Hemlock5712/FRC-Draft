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
    console.log('Draft list API - Session:', session?.user);

    if (!session?.user?.id) {
      console.log('Draft list API - No session or user ID');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Draft list API - Fetching rooms for user:', session.user.id);
    
    // Call Convex query to get user's draft rooms
    const result = await convex.query(api.draftRooms.listUserDraftRooms, {
      userId: session.user.id
    });
    
    console.log('Draft list API - Convex query result:', JSON.stringify(result));
    
    // Check for empty or invalid result
    if (!result || !result.activeRooms) {
      console.log('Draft list API - Empty or invalid result from Convex');
      return NextResponse.json({ activeRooms: [] });
    }
    
    // Check for rooms with missing IDs
    const invalidRooms = result.activeRooms.filter((room: any) => !room || !room.id);
    if (invalidRooms.length > 0) {
      console.log('Draft list API - Found rooms with missing IDs:', invalidRooms);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Draft list API - Failed to fetch draft rooms:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft rooms' },
      { status: 500 }
    );
  }
}
