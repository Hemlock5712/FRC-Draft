import { NextRequest, NextResponse } from 'next/server';
import { Session } from 'next-auth';
import { withAuthenticatedSession } from '@/lib/apiUtils';
import prisma from '@/lib/prisma'; // Adjusted import path for prisma

// Define the handler function consistent with AuthenticatedApiHandler signature
const getUserHandler = async (
  sessionUser: Session['user'], 
  request?: NextRequest // request might not be used in this specific handler but included for signature consistency
) => {
  // sessionUser is guaranteed to be present by withAuthenticatedSession.
  // We assume 'email' is present on sessionUser based on existing logic.
  // A non-null assertion '!' is used; if email can be null, error handling or type checks should be more robust.
  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
  // Top-level try-catch is removed as withAuthenticatedSession handles generic errors.
};

// Wrap the handler with withAuthenticatedSession
export const GET = withAuthenticatedSession(getUserHandler);