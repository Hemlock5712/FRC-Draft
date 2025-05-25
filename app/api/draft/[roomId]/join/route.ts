import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = await context.params;
    const { roomId } = params;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
      // Let Convex handle the validation of the ID
      const result = await convex.mutation(api.draftRooms.joinDraftRoom, {
        // @ts-ignore - Convex will handle the ID validation
        roomId: roomId,
        userId: session.user.id,
      });

      return NextResponse.json(result);
    } catch (error: any) {
      // Convex errors often have a `data` field with more info
      console.error('Convex error joining draft room:', error);
      const errorMessage = error.data?.message || error.message || 'Failed to join draft room';
      const errorStatus = error.data?.status || 500;
      return NextResponse.json({ error: errorMessage }, { status: errorStatus });
    }

  } catch (error) {
    console.error('Outer error joining draft room:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 