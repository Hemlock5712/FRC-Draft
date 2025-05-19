import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const { name, description, maxTeams, pickTimeSeconds, snakeFormat } = body;

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

    if (pickTimeSeconds < 30 || pickTimeSeconds > 300) {
      return NextResponse.json(
        { message: 'Pick time must be between 30 and 300 seconds' },
        { status: 400 }
      );
    }

    // Create draft room and add creator as first participant in a transaction
    const draftRoom = await prisma.$transaction(async (tx) => {
      // Create the draft room
      const room = await tx.draftRoom.create({
        data: {
          name,
          description,
          maxTeams,
          pickTimeSeconds,
          snakeFormat,
          createdBy: session.user.id,
          status: 'PENDING',
        },
      });

      // Add creator as first participant
      await tx.draftParticipant.create({
        data: {
          userId: session.user.id,
          draftRoomId: room.id,
          pickOrder: 1,
          isReady: true, // Creator is automatically ready
        },
      });

      return room;
    });

    return NextResponse.json(draftRoom);
  } catch (error) {
    console.error('Failed to create draft room:', error);
    return NextResponse.json(
      { message: 'Failed to create draft room' },
      { status: 500 }
    );
  }
} 