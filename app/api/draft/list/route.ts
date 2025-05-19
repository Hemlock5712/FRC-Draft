import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { DraftRoom, DraftParticipant, User, Prisma } from '@prisma/client';

interface TransformedParticipant {
  user: {
    name: string | null;
  };
  isReady: boolean;
}

interface TransformedDraftRoom {
  id: string;
  name: string;
  description: string | null;
  status: string;
  maxTeams: number;
  pickTimeSeconds: number;
  snakeFormat: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  creator: {
    id: string;
    name: string | null;
    email: string | null;
  };
  DraftParticipant: TransformedParticipant[];
  _count: {
    DraftPick: number;
    DraftParticipant?: number;
  };
}

type DraftRoomWithRelations = Prisma.DraftRoomGetPayload<{
  include: {
    User: {
      select: { id: true; name: true; email: true };
    };
    DraftParticipant: {
      include: {
        user: {
          select: { name: true; email: true };
        };
      };
    };
    _count: {
      select: { DraftPick: true };
    };
  };
}>;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session);

    if (!session?.user?.id) {
      console.log('No session or user ID');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching rooms for user:', session.user.id);
    const activeRooms = await prisma.draftRoom.findMany({
      where: {
        OR: [
          { createdBy: session.user.id },
          {
            DraftParticipant: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
      include: {
        User: {
          select: { id: true, name: true, email: true }
        },
        DraftParticipant: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        _count: {
          select: { DraftPick: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as DraftRoomWithRelations[];

    console.log('Found rooms:', activeRooms);

    const transformedActiveRooms: TransformedDraftRoom[] = activeRooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: room.description,
      status: room.status,
      maxTeams: room.maxTeams,
      pickTimeSeconds: room.pickTimeSeconds,
      snakeFormat: room.snakeFormat,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      creator: {
        id: room.User.id,
        name: room.User.name,
        email: room.User.email
      },
      DraftParticipant: room.DraftParticipant.map((p) => ({
        user: {
          name: p.user.name,
        },
        isReady: p.isReady,
      })),
      _count: {
        DraftPick: room._count.DraftPick,
        DraftParticipant: room.DraftParticipant.length
      }
    }));

    return NextResponse.json({
      activeRooms: transformedActiveRooms,
    });
  } catch (error) {
    console.error('Failed to fetch draft rooms:', error);
    return NextResponse.json(
      { message: 'Failed to fetch draft rooms' },
      { status: 500 }
    );
  }
}
