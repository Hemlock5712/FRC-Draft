import { NextRequest, NextResponse } from 'next/server';
import { Session } from 'next-auth';
import { withAuthenticatedSession } from '@/lib/apiUtils';
import prisma from '@/lib/prisma';

const getProfileHandler = async (sessionUser: Session['user']) => {
  // sessionUser is guaranteed to be present by withAuthenticatedSession
  // and includes 'id'. We assume 'email' is also present if 'id' is.
  // If email can be null on a user object, further checks or different logic might be needed.
  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email! },
      select: {
        username: true,
        bio: true,
        location: true,
        team: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
};

export const GET = withAuthenticatedSession(getProfileHandler);

const updateProfileHandler = async (sessionUser: Session['user'], request: NextRequest) => {
  // sessionUser is guaranteed by withAuthenticatedSession.
  // We assume email is present.
  const data = await request.json();
    const { username, bio, location, team } = data;

    // If username is provided, check if it's already taken by another user
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      // Check if the username is taken by *another* user
      if (existingUser && existingUser.email !== sessionUser.email!) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: sessionUser.email! },
      data: {
        username,
        bio,
        location,
        team,
      },
    });

    return NextResponse.json({
      username: updatedUser.username,
      bio: updatedUser.bio,
      location: updatedUser.location,
      team: updatedUser.team,
    });
  // The specific 400 error for username taken is handled above.
  // Other errors will be caught by withAuthenticatedSession's try-catch.
};

export const PUT = withAuthenticatedSession(updateProfileHandler);