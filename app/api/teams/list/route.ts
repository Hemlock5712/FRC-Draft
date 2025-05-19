import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '24');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build search conditions
    const searchConditions: Prisma.TeamWhereInput = {
      OR: [
        { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        search && !isNaN(parseInt(search)) ? { teamNumber: parseInt(search) } : null,
        { city: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { stateProv: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { country: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ].filter((condition): condition is Exclude<typeof condition, null> => condition !== null),
    };

    // Get teams from database with search and pagination
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where: searchConditions,
        orderBy: { teamNumber: 'asc' },
        skip,
        take: limit,
        include: {
          seasonData: true,
        },
      }),
      prisma.team.count({
        where: searchConditions,
      }),
    ]);

    return NextResponse.json({
      teams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
} 