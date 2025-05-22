import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Public API - Session:', session?.user);

    if (!session?.user?.id) {
      console.log('Public API - No session or user ID');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Public API - Fetching public rooms for user:', session.user.id);
    
    // Call the Convex function to get public draft rooms
    const result = await convex.query(api.draftRooms.listPublicDraftRooms, {
      userId: session.user.id,
    });
    
    console.log('Public API - Convex query result:', JSON.stringify(result));
    
    // Check for empty or invalid result
    if (!result || !result.publicRooms) {
      console.log('Public API - Empty or invalid result from Convex');
      return NextResponse.json({ publicRooms: [] });
    }
    
    // Check for rooms with missing IDs
    const invalidRooms = result.publicRooms.filter((room: any) => !room || !room._id);
    if (invalidRooms.length > 0) {
      console.log('Public API - Found rooms with missing IDs:', invalidRooms);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Public API - Error fetching public draft rooms:', error);
    return NextResponse.json(
      { message: 'Failed to fetch public draft rooms' },
      { status: 500 }
    );
  }
} 