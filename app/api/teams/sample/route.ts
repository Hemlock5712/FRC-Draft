import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function POST() {
  try {
    const result = await convex.mutation(api.teams.addSampleTeams, {});
    
    return NextResponse.json({
      message: "Sample teams added successfully",
      teamsAdded: result.length,
      teams: result
    });
  } catch (error) {
    console.error('Error adding sample teams:', error);
    return NextResponse.json(
      { error: 'Failed to add sample teams' },
      { status: 500 }
    );
  }
} 