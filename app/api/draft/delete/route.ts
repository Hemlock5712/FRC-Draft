import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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

    // 3) Check if user is the creator of the draft room
    const draftRoom = await prisma.draftRoom.findUnique({
      where: { id: roomId },
      include: { User: true }
    });

    if (!draftRoom) {
      return NextResponse.json({ message: 'Draft room not found' }, { status: 404 });
    }

    if (draftRoom.createdBy !== session.user.id) {
      return NextResponse.json({ message: 'Only the creator can delete the draft room' }, { status: 403 });
    }

    // 4) Delete the draft room and all related data
    await prisma.$transaction([
      // Delete all picks
      prisma.draftPick.deleteMany({
        where: { draftRoomId: roomId }
      }),
      // Delete all participants
      prisma.draftParticipant.deleteMany({
        where: { draftRoomId: roomId }
      }),
      // Delete the draft room
      prisma.draftRoom.delete({
        where: { id: roomId }
      })
    ]);

    return NextResponse.json({ message: 'Draft room deleted successfully' });
  } catch (error) {
    console.error('Failed to delete draft room:', error);
    return NextResponse.json(
      { message: 'Failed to delete draft room' },
      { status: 500 }
    );
  }
} 