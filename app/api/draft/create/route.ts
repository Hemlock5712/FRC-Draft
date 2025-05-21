import { NextResponse } from 'next/server';
import { Session } from 'next-auth'; // Import Session for sessionUser type
import { withAuthenticatedSession } from '@/lib/apiUtils'; // Import the wrapper
import prisma from '@/lib/prisma';

// Define the handler function that will be wrapped
const createDraftHandler = async (sessionUser: Session['user'], request: Request) => {
  // sessionUser is guaranteed by withAuthenticatedSession, so sessionUser.id can be used.
  // A non-null assertion '!' is used for sessionUser.id for explicitness,
  // assuming 'id' is always present on a valid sessionUser.

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
  // The outer try-catch for generic errors is removed; withAuthenticatedSession handles it.
  // Specific validation errors returning 400 are kept.
  const draftRoom = await prisma.$transaction(async (tx) => {
    // Create the draft room
    const room = await tx.draftRoom.create({
      data: {
        name,
        description,
        maxTeams,
        pickTimeSeconds,
        snakeFormat,
        createdBy: sessionUser.id!, // Use sessionUser.id
        status: 'PENDING',
      },
    });

    // Add creator as first participant
    await tx.draftParticipant.create({
      data: {
        userId: sessionUser.id!, // Use sessionUser.id
        draftRoomId: room.id,
        pickOrder: 1,
        isReady: true, // Creator is automatically ready
      },
    });

    return room;
  });

  return NextResponse.json(draftRoom);
};

// Export the wrapped handler
export const POST = withAuthenticatedSession(createDraftHandler);