import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Create a Convex HTTP client for server-side API routes
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const roomId = resolvedParams.roomId;

    if (!roomId) {
      return NextResponse.json(
        { message: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Call Convex query to get pick history
    const picks = await convex.query(api.draftPicks.getDraftPicks, {
      roomId: roomId,
    });

    return NextResponse.json({ picks });
  } catch (error) {
    console.error('Failed to fetch pick history:', error);
    return NextResponse.json(
      { message: 'Failed to fetch pick history' },
      { status: 500 }
    );
  }
} 