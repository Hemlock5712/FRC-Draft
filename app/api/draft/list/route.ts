import { NextResponse } from 'next/server';
// Removed getServerSession and authOptions
import { Session } from 'next-auth'; // Added Session for sessionUser type
import { withAuthenticatedSession } from '@/lib/apiUtils'; // Added withAuthenticatedSession
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // DraftRoom, DraftParticipant, User might be covered by Prisma.DraftRoomGetPayload if not used directly


// Interface definitions (TransformedParticipant, TransformedDraftRoom) remain the same
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

// Type definition for DraftRoomWithRelations remains the same
type DraftRoomWithRelations = Prisma.DraftRoomGetPayload<{
  include: {
    User: {
      select: { id: true; name: true; email: true };
    };
    DraftParticipant: {
      include: {
        user: {
          select: { name: true; email: true }; // email was already here, keeping it
        };
      };
    };
    _count: {
      select: { DraftPick: true };
    };
  };
}>;

// Define the handler function that will be wrapped
const getDraftListHandler = async (sessionUser: Session['user'], request?: Request) => {
  // sessionUser is guaranteed by withAuthenticatedSession.
  // Using sessionUser.id! as 'id' should be present on a valid sessionUser.
  // Removed console.log statements for session checking.

  const activeRooms = await prisma.draftRoom.findMany({
    where: {
      OR: [
        { createdBy: sessionUser.id! },
        {
          DraftParticipant: {
            some: {
              userId: sessionUser.id!,
              },
            },
          },
        ],
      },
      include: {
        User: { // This is the relation to the creator User model
          select: { id: true, name: true, email: true }
        },
        DraftParticipant: {
          include: {
            user: { // This is the User related to DraftParticipant
              select: { name: true, email: true } // Keeping email as it was in original
            }
          }
        },
        _count: {
          select: { DraftPick: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as DraftRoomWithRelations[]; // Casting to unknown first, then to specific type for safety if needed

    // console.log('Found rooms:', activeRooms); // Optionally remove or keep for debugging

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
      creator: { // Corresponds to room.User (the creator)
        id: room.User.id,
        name: room.User.name,
        email: room.User.email
      },
      DraftParticipant: room.DraftParticipant.map((p) => ({
        user: {
          name: p.user.name, // p.user is the user associated with the participant
        },
        isReady: p.isReady,
      })),
      _count: {
        DraftPick: room._count.DraftPick,
        DraftParticipant: room.DraftParticipant.length // Calculate participant count
      }
    }));

    return NextResponse.json({
      activeRooms: transformedActiveRooms,
    });
  // Top-level try-catch is removed as withAuthenticatedSession handles generic errors.
};

// Export the wrapped handler
export const GET = withAuthenticatedSession(getDraftListHandler);
