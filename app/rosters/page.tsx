'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface RosterEntry {
  _id: string;
  draftRoomId: string;
  teamId: string;
  isStarting: boolean;
  acquisitionType: string;
  acquisitionDate: string;
  totalPointsScored: number;
  weeksStarted: number;
  team: {
    _id: string;
    teamId: string;
    teamNumber: number;
    name: string;
  };
}

interface DraftRoom {
  _id: string;
  name: string;
  status: string;
  teamsToStart?: number;
}

export default function RostersOverview() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [status, router]);

  // Get all draft rooms the user participates in
  const draftRooms = useQuery(
    api.draft.getUserDraftRooms,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Please sign in to view your rosters</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Rosters</h1>
              <p className="mt-2 text-gray-600">
                Manage your team rosters across all draft rooms
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Roster Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {draftRooms === undefined ? (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-500">Loading draft rooms...</div>
            </div>
          ) : draftRooms === null || draftRooms.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rosters found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't participated in any drafts yet.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Join a Draft
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            draftRooms.map((room: DraftRoom) => (
              <RosterCard key={room._id} room={room} userId={session.user.id} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Component for individual roster cards
function RosterCard({ room, userId }: { room: DraftRoom; userId: string }) {
  const roster = useQuery(api.playerManagement.getUserRoster, {
    userId,
    draftRoomId: room._id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (roster === undefined) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const startingTeams = roster?.filter((entry: RosterEntry) => entry.isStarting) || [];
  const benchTeams = roster?.filter((entry: RosterEntry) => !entry.isStarting) || [];
  const totalTeams = roster?.length || 0;
  const maxStarting = room.teamsToStart || 5;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{room.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
            {room.status}
          </span>
        </div>

        {totalTeams === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No teams drafted yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-semibold text-green-900">{startingTeams.length}/{maxStarting}</div>
                <div className="text-green-600">Starting</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-semibold text-gray-900">{benchTeams.length}</div>
                <div className="text-gray-600">Bench</div>
              </div>
            </div>

            {/* Starting Teams Preview */}
            {startingTeams.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Starting Lineup:</h4>
                <div className="space-y-1">
                  {startingTeams.slice(0, 3).map((entry: RosterEntry) => (
                    <div key={entry._id} className="text-sm text-gray-600 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      {entry.team.teamNumber} - {entry.team.name.length > 25 ? 
                        entry.team.name.substring(0, 25) + '...' : 
                        entry.team.name
                      }
                    </div>
                  ))}
                  {startingTeams.length > 3 && (
                    <div className="text-xs text-gray-400">
                      +{startingTeams.length - 3} more starting teams
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6">
          <Link
            href={`/roster/${room._id}`}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Manage Roster
          </Link>
        </div>
      </div>
    </div>
  );
} 