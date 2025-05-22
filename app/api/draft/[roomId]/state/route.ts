import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function GET(
  request: Request,
  context: { params: { roomId: string } }
) {
  try {
    // 1) Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    }

    // 2) Validate roomId
    const { roomId } = context.params;
    if (!roomId || roomId === 'undefined') {
      return NextResponse.json({ message: 'Invalid draft room ID' }, { status: 400 });
    }

    try {
      // 3) Type assertion for Convex Id only if we have a valid roomId
      const draftState = await convex.query(api.draftPicks.getDraftState, {
        roomId: roomId as Id<"draftRooms">,
        userId: session.user.id,
      });

      if (!draftState) {
        return NextResponse.json({ message: 'Draft room not found or access denied' }, { status: 404 });
      }
      
      // 4) Validate participant access
      const isParticipant = draftState.participants.some(
        (p: any) => p.userId === session.user.id
      );

      if (!isParticipant) {
        return NextResponse.json(
          { message: 'Not a participant in this draft' }, 
          { status: 403 }
        );
      }

      return NextResponse.json(draftState);

    } catch (error: any) {
      // 5) Handle Convex-specific errors
      if (error.message?.includes('Value does not match validator')) {
        return NextResponse.json({ message: 'Invalid draft room ID format' }, { status: 400 });
      }
      
      const errorMessage = error.data?.message || error.message || 'Failed to fetch draft state';
      const errorStatus = error.data?.status || 500;
      console.error('Convex error fetching draft state:', error.data || error);
      return NextResponse.json({ message: errorMessage }, { status: errorStatus });
    }

  } catch (error) {
    console.error('Outer error in draft state route:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 