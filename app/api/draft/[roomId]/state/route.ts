import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

type DraftRoomWithRelations = Prisma.DraftRoomGetPayload<{
  include: {
    DraftParticipant: {
      include: {
        user: true;
      };
    };
    DraftPick: {
      include: {
        participant: {
          include: {
            user: true;
          };
        };
        team: true;
      };
    };
  };
}>;

export async function GET(
  request: Request,
  context: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session in API route:', {
      session: session ? {
        ...session,
        user: session.user ? {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name
        } : null
      } : null
    });

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.user) {
      return NextResponse.json({ error: 'No user in session' }, { status: 401 });
    }

    if (!session.user.id) {
      return NextResponse.json({ error: 'No user ID in session' }, { status: 401 });
    }

    const { roomId } = await context.params;
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Get the draft room
    const draftRoom = await prisma.draftRoom.findUnique({
      where: { id: roomId },
      include: {
        DraftParticipant: {
          include: {
            user: true,
          },
        },
        DraftPick: {
          orderBy: {
            pickNumber: 'asc',
          },
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
    });

    if (!draftRoom) {
      return NextResponse.json({ error: 'Draft room not found' }, { status: 404 });
    }

    console.log('Draft room debug:', {
      id: draftRoom.id,
      name: draftRoom.name,
      participantCount: draftRoom.DraftParticipant.length,
      participants: draftRoom.DraftParticipant.map(p => ({
        id: p.id,
        userId: p.userId,
        isReady: p.isReady,
        user: {
          id: p.user.id,
          email: p.user.email,
          name: p.user.name
        }
      }))
    });

    // Check if user is a participant
    const isParticipant = draftRoom.DraftParticipant.some(
      (p) => p.userId === session.user.id
    );
    
    console.log('Auth debug:', {
      sessionUserId: session.user.id,
      participants: draftRoom.DraftParticipant.map(p => ({
        id: p.id,
        userId: p.userId,
        user: {
          id: p.user.id,
          email: p.user.email,
          name: p.user.name
        }
      })),
      isParticipant
    });

    if (!isParticipant) {
      return NextResponse.json(
        { 
          error: 'Not a participant in this draft',
          debug: {
            userId: session.user.id,
            participants: draftRoom.DraftParticipant.map(p => ({
              userId: p.userId,
              user: {
                id: p.user.id,
                email: p.user.email,
                name: p.user.name
              }
            }))
          }
        },
        { status: 403 }
      );
    }

    // Calculate current drafter
    const totalPicks = draftRoom.DraftPick.length;
    const currentPickNumber = totalPicks + 1;
    const currentRound = Math.floor(totalPicks / draftRoom.maxTeams) + 1;
    const pickInRound = totalPicks % draftRoom.maxTeams;
    
    // For snake draft, reverse order in even rounds
    const draftOrder = draftRoom.DraftParticipant.map(p => p.userId);
    if (draftRoom.snakeFormat && currentRound % 2 === 0) {
      draftOrder.reverse();
    }

    const currentDrafterIndex = pickInRound;
    const currentDrafterId = draftOrder[currentDrafterIndex];
    const currentDrafter = draftRoom.DraftParticipant.find(
      (p) => p.userId === currentDrafterId
    );

    // Get available teams (not yet picked)
    const pickedTeamIds = draftRoom.DraftPick.map((pick) => pick.teamId);
    const availableTeams = await prisma.team.findMany({
      where: {
        id: {
          notIn: pickedTeamIds,
        },
      },
      orderBy: {
        teamNumber: 'asc',
      },
    });

    // Calculate time remaining (if pick timer is active)
    const lastPick = draftRoom.DraftPick[draftRoom.DraftPick.length - 1];
    const timeRemaining = lastPick
      ? Math.max(
          0,
          draftRoom.pickTimeSeconds -
            Math.floor((Date.now() - new Date(lastPick.pickedAt).getTime()) / 1000)
        )
      : draftRoom.pickTimeSeconds;

    return NextResponse.json({
      room: {
        id: draftRoom.id,
        name: draftRoom.name,
        description: draftRoom.description,
        status: draftRoom.status,
        maxTeams: draftRoom.maxTeams,
        pickTimeLimit: draftRoom.pickTimeSeconds,
        isSnakeDraft: draftRoom.snakeFormat,
        creatorId: draftRoom.createdBy,
        startTime: draftRoom.startTime,
        endTime: draftRoom.endTime,
        createdAt: draftRoom.createdAt,
        updatedAt: draftRoom.updatedAt
      },
      participants: draftRoom.DraftParticipant.map((p) => ({
        id: p.id,
        userId: p.userId,
        isReady: p.isReady,
        joinedAt: p.createdAt,
        updatedAt: p.updatedAt,
        user: {
          name: p.user.name,
          email: p.user.email,
        },
      })),
      picks: draftRoom.DraftPick.map((p) => ({
        id: p.id,
        teamId: p.teamId,
        pickNumber: p.pickNumber,
        participantId: p.participantId,
        pickedAt: p.pickedAt,
        team: {
          id: p.team.id,
          name: p.team.name,
          number: p.team.teamNumber,
        },
        participant: {
          id: p.participant.id,
          user: {
            name: p.participant.user.name,
            email: p.participant.user.email,
          },
        },
      })),
      availableTeams: availableTeams.map((t) => ({
        id: t.id,
        name: t.name,
        number: t.teamNumber,
      })),
      currentDrafter: currentDrafter ? {
        id: currentDrafter.id,
        user: {
          name: currentDrafter.user.name,
          email: currentDrafter.user.email,
        },
      } : null,
      isMyTurn: currentDrafterId === session.user.id,
      currentPickNumber,
      currentRound,
      timeRemaining,
    });
  } catch (error) {
    console.error('Error in draft state route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 