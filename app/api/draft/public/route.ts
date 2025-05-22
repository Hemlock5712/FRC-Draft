import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    // Call the Convex function to get public draft rooms
    const result = await convex.query(api.draftRooms.listPublicDraftRooms, {
      userId: session.user.id,
    });
    
    // Check for empty or invalid result
    if (!result || !result.publicRooms) {
      return NextResponse.json({ publicRooms: [] });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching public draft rooms:', error);
    return NextResponse.json(
      { message: 'Failed to fetch public draft rooms' },
      { status: 500 }
    );
  }
} 