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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = await context.params;
    const { roomId } = params;
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
      const result = await convex.mutation(api.draftPicks.makePick, {
        roomId: roomId as Id<"draftRooms">,
        userId: session.user.id,
        teamId: teamId,
      });

      return NextResponse.json(result);
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Failed to make pick';
      const errorStatus = error.data?.status || 500;
      console.error('Convex error making pick:', error.data || error);
      return NextResponse.json({ error: errorMessage }, { status: errorStatus });
    }

  } catch (error) {
    console.error('Outer error making pick:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 