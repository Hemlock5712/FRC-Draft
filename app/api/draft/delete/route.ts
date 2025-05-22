import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function DELETE(request: Request) {
  try {
    // 1) Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // 2) Get draft room ID from URL
    const url = new URL(request.url);
    const roomId = url.searchParams.get('id');
    
    if (!roomId) {
      return NextResponse.json({ message: 'Draft room ID is required' }, { status: 400 });
    }

    try {
      const result = await convex.mutation(api.draftRooms.deleteDraftRoom, {
        roomId: roomId as Id<"draftRooms">,
        userId: session.user.id as Id<'users'>,
      });
      return NextResponse.json(result);
    } catch (error: any) {
      const errorMessage = error.data?.message || error.message || 'Failed to delete draft room';
      const errorStatus = error.data?.status || 500;
      console.error('Convex error deleting draft room:', error.data || error);
      return NextResponse.json({ error: errorMessage }, { status: errorStatus });
    }

  } catch (error) {
    console.error('Outer error deleting draft room:', error);
    return NextResponse.json(
      { message: 'Failed to delete draft room' }, // Generic outer error
      { status: 500 }
    );
  }
} 