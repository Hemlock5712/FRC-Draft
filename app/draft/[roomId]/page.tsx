'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
import type { Team, DraftRoom, DraftParticipant, DraftPick, User } from '@prisma/client';

interface DraftRoomState {
  room: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    maxTeams: number;
    pickTimeSeconds: number;
    snakeFormat: boolean;
    createdBy: string;
    startTime: Date | null;
    endTime: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  participants: {
    id: string;
    userId: string;
    roomId: string;
    isReady: boolean;
    user: {
      name: string | null;
      email: string | null;
    };
  }[];
  picks: {
    id: string;
    teamId: string;
    pickNumber: number;
    participantId: string;
    pickedAt: Date;
    team: {
      id: string;
      name: string;
      number: number;
    };
    participant: {
      id: string;
      user: {
        name: string | null;
        email: string | null;
      };
    };
  }[];
  availableTeams: {
    id: string;
    name: string;
    number: number;
  }[];
  currentDrafter: {
    id: string;
    user: {
      name: string | null;
      email: string | null;
    };
  } | null;
  isMyTurn: boolean;
  currentPickNumber: number;
  currentRound: number;
  timeRemaining: number;
}

export default function DraftRoom({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [draftState, setDraftState] = useState<DraftRoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'loading') {
      return;
    }

    if (!session?.user?.id) {
      console.error('No user ID in session:', session);
      setError('Not authenticated');
      return;
    }

    if (!resolvedParams?.roomId) {
      console.error('No room ID in params:', resolvedParams);
      setError('Room ID is required');
      return;
    }

    fetchDraftState();
    // Set up polling for draft state
    const interval = setInterval(fetchDraftState, 5000);
    return () => clearInterval(interval);
  }, [session, resolvedParams, status]);

  const fetchDraftState = async () => {
    try {
      if (!resolvedParams?.roomId) {
        throw new Error('Room ID is required');
      }

      if (!session?.user?.id) {
        throw new Error('Not authenticated');
      }

      console.log('Fetching draft state with session:', {
        userId: session.user.id,
        roomId: resolvedParams.roomId
      });

      const response = await fetch(`/api/draft/${resolvedParams.roomId}/state`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();
      console.log('Draft state data:', data);

      if (!response.ok) {
        console.error('Draft state error response:', data);
        throw new Error(data.error || 'Failed to fetch draft state');
      }

      if (!data.participants || !Array.isArray(data.participants)) {
        console.error('Invalid draft state data:', data);
        throw new Error('Invalid draft state data received');
      }

      setDraftState(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching draft state:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamPick = async (teamId: string) => {
    try {
      const response = await fetch(`/api/draft/${resolvedParams.roomId}/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to make pick');
      }

      // Refresh draft state
      fetchDraftState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make pick');
    }
  };

  const handleJoinDraft = async () => {
    try {
      setIsJoining(true);
      const response = await fetch(`/api/draft/${resolvedParams.roomId}/join`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join draft room');
      }

      // Refresh draft state
      await fetchDraftState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join draft room');
    } finally {
      setIsJoining(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Draft room not found</div>
      </div>
    );
  }

  // Check if current user is a participant
  const isParticipant = draftState.participants.some(
    (p) => p.userId === session?.user?.id
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{draftState.room.name}</h1>
              {draftState.room.description && (
                <p className="mt-2 text-gray-600">{draftState.room.description}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Round {draftState.currentRound}</div>
              <div className="text-sm text-gray-500">Pick {draftState.currentPickNumber}</div>
              {draftState.timeRemaining > 0 && (
                <div className="text-sm font-medium text-orange-600">
                  {Math.floor(draftState.timeRemaining / 60)}:{(draftState.timeRemaining % 60).toString().padStart(2, '0')} remaining
                </div>
              )}
              {/* Add Join button if not a participant */}
              {!isParticipant && draftState.room.status === 'PENDING' && (
                <button
                  onClick={handleJoinDraft}
                  disabled={isJoining}
                  className={`mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                    isJoining ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isJoining ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Joining...
                    </>
                  ) : (
                    'Join Draft'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Participants */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
            <div className="space-y-4">
              {draftState.participants.map((participant) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    draftState.currentDrafter?.id === participant.id
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {participant.user.name || participant.user.email}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.isReady ? 'Ready' : 'Not Ready'}
                    </div>
                  </div>
                  {draftState.currentDrafter?.id === participant.id && (
                    <div className="text-sm font-medium text-blue-600">
                      Currently Picking
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Draft Board */}
          <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Draft Board</h2>
            <div className="space-y-4">
              {draftState.picks.map((pick) => (
                <div
                  key={pick.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {pick.team.number} - {pick.team.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Picked by {pick.participant.user.name || pick.participant.user.email}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Pick #{pick.pickNumber}
                  </div>
                </div>
              ))}
            </div>

            {/* Available Teams */}
            {draftState.isMyTurn && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Teams</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {draftState.availableTeams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => handleTeamPick(team.id)}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {team.number} - {team.name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 