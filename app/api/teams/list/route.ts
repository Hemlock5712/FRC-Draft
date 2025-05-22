import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL as string);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const search = searchParams.get('search') || '';

    // Call Convex query for teams with search and pagination
    const result = await convex.query(api.teams.listTeamsWithSearchAndPagination, {
      search,
      paginationOpts: { numItems: limit, cursor: searchParams.get('cursor') || null },
    });

    // Return the response matching the actual Convex query result structure
    return NextResponse.json({
      teams: result.teams,
      totalTeams: result.totalTeams,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      page,
      limit,
    });

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { message: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
} 