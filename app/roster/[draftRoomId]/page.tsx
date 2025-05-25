'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { use } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import Link from 'next/link';

interface RosterEntry {
  _id: string;
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
  } | null;
}

export default function RosterManagement({ params }: { params: Promise<{ draftRoomId: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPickHistory, setShowPickHistory] = useState(false);
  const [pickHistory, setPickHistory] = useState<any[]>([]);


  // Get user's roster
  const roster = useQuery(api.playerManagement.getUserRoster, 
    resolvedParams?.draftRoomId && session?.user?.id ? {
      userId: session.user.id,
      draftRoomId: resolvedParams.draftRoomId,
    } : "skip"
  );

  // Get draft room info
  const draftRoom = useQuery(api.draft.getDraftState,
    resolvedParams?.draftRoomId ? { roomId: resolvedParams.draftRoomId as any } : "skip"
  );

  // Mutation to update starting lineup
  const updateLineup = useMutation(api.playerManagement.updateStartingLineup);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Initialize selected teams with current starting lineup
    if (roster) {
      const startingTeams = roster
        .filter((entry: RosterEntry) => entry.isStarting)
        .map((entry: RosterEntry) => entry.teamId);
      setSelectedTeams(startingTeams);
    }
  }, [status, router, roster]);

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamId)) {
        return prev.filter(id => id !== teamId);
      } else {
        // Check if we're at the maximum starting teams limit
        const maxStarting = draftRoom?.room?.teamsToStart || 5;
        if (prev.length >= maxStarting) {
          setError(`You can only start ${maxStarting} teams`);
          return prev;
        }
        return [...prev, teamId];
      }
    });
    setError(null);
  };

  const handleSaveLineup = async () => {
    if (!session?.user?.id || !resolvedParams?.draftRoomId) return;

    try {
      setIsUpdating(true);
      setError(null);

      await updateLineup({
        userId: session.user.id,
        draftRoomId: resolvedParams.draftRoomId,
        startingTeamIds: selectedTeams,
      });

      // Show success message briefly
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lineup');
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchPickHistory = async () => {
    if (!resolvedParams?.draftRoomId) return;

    try {
      const response = await fetch(`/api/draft/${resolvedParams.draftRoomId}/picks`);
      if (!response.ok) {
        throw new Error('Failed to fetch pick history');
      }
      const data = await response.json();
      setPickHistory(data.picks || []);
      setShowPickHistory(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pick history');
    }
  };

  if (status === 'loading' || !roster) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading roster...</div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Please sign in to view your roster</div>
      </div>
    );
  }

  const maxStarting = draftRoom?.room?.teamsToStart || 5;
  const startingTeams = roster.filter((entry: RosterEntry) => selectedTeams.includes(entry.teamId));
  const benchTeams = roster.filter((entry: RosterEntry) => !selectedTeams.includes(entry.teamId));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Roster</h1>
              <p className="mt-2 text-gray-600">
                {draftRoom?.room?.name} - Manage your starting lineup
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Starting: {selectedTeams.length}/{maxStarting}
              </div>
              <div className="text-sm text-gray-500">
                Bench: {roster.length - selectedTeams.length}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSaveLineup}
              disabled={isUpdating}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isUpdating
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isUpdating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Starting Lineup'
              )}
            </button>
            
            <Link
              href={`/trading/${resolvedParams.draftRoomId}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Trade Teams
            </Link>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Starting Lineup */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Starting Lineup ({selectedTeams.length}/{maxStarting})
            </h2>
            
            {startingTeams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No teams in starting lineup</p>
                <p className="text-sm">Click teams from your roster to add them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {startingTeams.map((entry: RosterEntry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100"
                    onClick={() => handleTeamToggle(entry.teamId)}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {entry.team ? `${entry.team.teamNumber} - ${entry.team.name}` : 'Team not found'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Points: {entry.totalPointsScored} | Weeks Started: {entry.weeksStarted}
                      </div>
                    </div>
                    <div className="text-green-600">
                      ✓ Starting
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bench */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
              Bench ({benchTeams.length})
            </h2>
            
            {benchTeams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No teams on bench</p>
                <p className="text-sm">All your teams are starting!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {benchTeams.map((entry: RosterEntry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => handleTeamToggle(entry.teamId)}
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {entry.team ? `${entry.team.teamNumber} - ${entry.team.name}` : 'Team not found'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Points: {entry.totalPointsScored} | Drafted: {entry.acquisitionType}
                      </div>
                    </div>
                    <div className="text-gray-400">
                      Bench
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click on teams to move them between starting lineup and bench</li>
            <li>• You can start up to {maxStarting} teams each week</li>
            <li>• Only starting teams will score points for you</li>
            <li>• Remember to save your lineup changes</li>
            <li>• Team performance will be tracked based on their real competition results</li>
          </ul>
        </div>

        {/* Additional Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchPickHistory}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View League Draft History
          </button>
        </div>
      </div>

      {/* Pick History Modal */}
      {showPickHistory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  League Draft History
                </h3>
                <button
                  onClick={() => setShowPickHistory(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2">
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pick #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Round
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Team
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Picked By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pickHistory.map((pick) => (
                        <tr key={pick._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pick.pickNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pick.roundNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pick.team ? `${pick.team.teamNumber} - ${pick.team.name}` : 'Team not found'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pick.participant?.user?.name || pick.participant?.user?.email || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(pick.pickedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
} 