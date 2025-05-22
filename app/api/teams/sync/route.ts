import { NextRequest, NextResponse } from 'next/server';
import { syncTeams } from '@/lib/services/syncService';

export async function POST(request: NextRequest) {
  try {
    // const syncService = new SyncService(); // Old way
    // const result = await syncService.syncTeams(); // Old way
    const result = await syncTeams(); // New way

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
} 