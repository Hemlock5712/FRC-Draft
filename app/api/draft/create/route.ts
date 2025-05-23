import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Create a Convex HTTP client for server-side API routes
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, maxTeams, pickTimeSeconds, snakeFormat, privacy, numberOfRounds, teamsToStart } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { message: 'Room name is required' },
        { status: 400 }
      );
    }

    if (maxTeams < 2 || maxTeams > 32) {
      return NextResponse.json(
        { message: 'Maximum teams must be between 2 and 32' },
        { status: 400 }
      );
    }

    if (maxTeams % 2 !== 0) {
      return NextResponse.json(
        { message: 'Maximum teams must be an even number' },
        { status: 400 }
      );
    }

    if (pickTimeSeconds < 30 || pickTimeSeconds > 300) {
      return NextResponse.json(
        { message: 'Pick time must be between 30 and 300 seconds' },
        { status: 400 }
      );
    }

    if (numberOfRounds < 1 || numberOfRounds > 20) {
      return NextResponse.json(
        { message: 'Number of rounds must be between 1 and 20' },
        { status: 400 }
      );
    }

    if (teamsToStart < 1 || teamsToStart > 15) {
      return NextResponse.json(
        { message: 'Teams to start must be between 1 and 15' },
        { status: 400 }
      );
    }

    // Call Convex mutation to create the draft room
    const draftRoomId = await convex.mutation(api.draftRooms.createDraftRoom, {
      name,
      description,
      maxTeams,
      pickTimeSeconds,
      snakeFormat,
      privacy: privacy || "PUBLIC", // Default to PUBLIC if not specified
      numberOfRounds: numberOfRounds || 8, // Default to 8 rounds
      teamsToStart: teamsToStart || 5, // Default to 5 teams to start
      userId: session.user.id,
    });

    return NextResponse.json({ id: draftRoomId });
  } catch (error) {
    console.error('Failed to create draft room:', error);
    return NextResponse.json(
      { message: 'Failed to create draft room' },
      { status: 500 }
    );
  }
} 