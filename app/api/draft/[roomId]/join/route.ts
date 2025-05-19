import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { roomId } = context.params;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Get the draft room
    const draftRoom = await prisma.draftRoom.findUnique({
      where: { id: roomId },
      include: {
        DraftParticipant: true,
      },
    });

    if (!draftRoom) {
      return NextResponse.json({ error: 'Draft room not found' }, { status: 404 });
    }

    // Check if room is joinable
    if (draftRoom.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only join draft rooms that are pending' },
        { status: 400 }
      );
    }

    // Check if user is already a participant
    const existingParticipant = draftRoom.DraftParticipant.find(
      (p) => p.userId === session.user.id
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Already a participant in this draft' },
        { status: 400 }
      );
    }

    // Check if room is full
    if (draftRoom.DraftParticipant.length >= draftRoom.maxTeams) {
      return NextResponse.json(
        { error: 'Draft room is full' },
        { status: 400 }
      );
    }

    // Add user as participant
    const participant = await prisma.draftParticipant.create({
      data: {
        userId: session.user.id,
        draftRoomId: roomId,
        pickOrder: draftRoom.DraftParticipant.length + 1,
        isReady: false,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Successfully joined draft room',
      participant: {
        id: participant.id,
        userId: participant.userId,
        isReady: participant.isReady,
        user: {
          name: participant.user.name,
          email: participant.user.email,
        },
      },
    });
  } catch (error) {
    console.error('Failed to join draft room:', error);
    return NextResponse.json(
      { error: 'Failed to join draft room' },
      { status: 500 }
    );
  }
} 