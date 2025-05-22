import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Corrected path for authOptions
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await convex.query(api.users.getUserByEmail, { email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return only the specific profile fields
    return NextResponse.json({
      username: user.username,
      bio: user.bio,
      location: user.location,
      team: user.team,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { username, bio, location, team } = data;

    // If username is provided, check if it's already taken by another user via a Convex query
    if (username) {
      const existingUserByUsername = await convex.query(api.users.getUserByUsername, { username });
      if (existingUserByUsername && existingUserByUsername._id !== session.user.id) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    const updatedUser = await convex.mutation(api.users.updateUserProfile, {
      id: session.user.id, // Pass the user's Convex ID
      username,
      bio,
      location,
      team,
    });

    if (!updatedUser) {
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    return NextResponse.json({
      username: updatedUser.username,
      bio: updatedUser.bio,
      location: updatedUser.location,
      team: updatedUser.team,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 