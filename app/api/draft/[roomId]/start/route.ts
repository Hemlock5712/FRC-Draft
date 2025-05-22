import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    // 1) Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2) Validate roomId - await the params
    const params = await context.params;
    const { roomId } = params;
    if (!roomId || roomId === 'undefined') {
      return NextResponse.json({ error: 'Invalid draft room ID' }, { status: 400 });
    }

    try {
      // 3) Call Convex to start the draft
      const result = await convex.mutation(api.draftRooms.startDraft, {
        roomId: roomId as Id<"draftRooms">,
        userId: session.user.id,
      });

      return NextResponse.json(result);
    } catch (error: any) {
      // 4) Handle Convex-specific errors
      const errorMessage = error.data?.message || error.message || 'Failed to start draft';
      const errorStatus = error.data?.status || 500;
      console.error('Convex error starting draft:', error.data || error);
      return NextResponse.json({ error: errorMessage }, { status: errorStatus });
    }

  } catch (error) {
    console.error('Outer error in start draft route:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 