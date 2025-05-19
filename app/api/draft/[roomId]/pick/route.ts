import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DraftRoom, DraftParticipant, DraftPick, Team, User } from '@prisma/client';

type DraftPickWithRelations = DraftPick & {
  participant: DraftParticipant & {
    user: User;
  };
  team: Team;
};

type DraftRoomWithRelations = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  maxTeams: number;
  pickTimeSeconds: number;
  snakeFormat: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  participants: (DraftParticipant & {
    user: User;
  })[];
  picks: (DraftPick & {
    participant: DraftParticipant & {
      user: User;
    };
    team: Team;
  })[];
};

export async function POST(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { roomId } = await context.params;
    const { teamId } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Get the draft room with participants and picks
    const draftRoom = await prisma.draftRoom.findUnique({
      where: { id: roomId },
      include: {
        DraftParticipant: {
          include: {
            user: true,
          },
        },
        DraftPick: {
          include: {
            participant: {
              include: {
                user: true,
              },
            },
            team: true,
          },
        },
      },
    }) as unknown as {
      id: string;
      name: string;
      description: string | null;
      status: string;
      maxTeams: number;
      pickTimeSeconds: number;
      snakeFormat: boolean;
      createdAt: Date;
      updatedAt: Date;
      createdBy: string;
      DraftParticipant: (DraftParticipant & {
        user: User;
      })[];
      DraftPick: (DraftPick & {
        participant: DraftParticipant & {
          user: User;
        };
        team: Team;
      })[];
    };

    if (!draftRoom) {
      return NextResponse.json({ error: 'Draft room not found' }, { status: 404 });
    }

    // Check if user is a participant
    const participant = draftRoom.DraftParticipant.find(
      (p: DraftParticipant) => p.userId === session.user.id
    );

    if (!participant) {
      return NextResponse.json(
        { error: 'Not a participant in this draft' },
        { status: 403 }
      );
    }

    // Calculate current pick
    const totalPicks = draftRoom.DraftPick.length;
    const currentPickNumber = totalPicks + 1;
    const currentRound = Math.floor(totalPicks / draftRoom.maxTeams) + 1;
    const pickInRound = totalPicks % draftRoom.maxTeams;

    // For snake draft, reverse order in even rounds
    const draftOrder = draftRoom.DraftParticipant.map((p: DraftParticipant) => p.userId);
    if (draftRoom.snakeFormat && currentRound % 2 === 0) {
      draftOrder.reverse();
    }

    const currentDrafterIndex = pickInRound;
    const currentDrafterId = draftOrder[currentDrafterIndex];

    // Check if it's the user's turn
    if (currentDrafterId !== session.user.id) {
      return NextResponse.json(
        { error: 'Not your turn to pick' },
        { status: 403 }
      );
    }

    // Check if team is available
    const isTeamPicked = draftRoom.DraftPick.some((pick: DraftPick) => pick.teamId === teamId);
    if (isTeamPicked) {
      return NextResponse.json(
        { error: 'Team has already been picked' },
        { status: 400 }
      );
    }

    // Create the pick
    const pick = await prisma.draftPick.create({
      data: {
        teamId,
        pickNumber: currentPickNumber,
        roundNumber: currentRound,
        participantId: participant.id,
        draftRoomId: roomId,
      },
      include: {
        participant: {
          include: {
            user: true,
          },
        },
        team: true,
      },
    });

    // Check if draft is complete
    if (draftRoom.DraftPick.length === draftRoom.maxTeams * draftRoom.DraftParticipant.length) {
      await prisma.draftRoom.update({
        where: { id: roomId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
        },
      });
    }

    return NextResponse.json({
      pick: {
        id: pick.id,
        teamId: pick.teamId,
        pickNumber: pick.pickNumber,
        drafterId: pick.participantId,
        drafterName: pick.participant.user.name || pick.participant.user.email,
        timestamp: pick.pickedAt,
        team: {
          id: pick.team.id,
          name: pick.team.name,
          number: pick.team.teamNumber,
        },
      },
    });
  } catch (error) {
    console.error('Error in draft pick:', error);
    return NextResponse.json(
      { error: 'Failed to make draft pick' },
      { status: 500 }
    );
  }
} 