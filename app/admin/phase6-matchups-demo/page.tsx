"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";

export default function Phase6MatchupsDemo() {
  const { data: session } = useSession();
  const [selectedDraftRoom, setSelectedDraftRoom] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Get user's draft rooms
  const userDraftRooms = useQuery(api.playerManagement.getUserDraftRoomsForTrading,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  // Get weekly matchups for selected room
  const weeklyMatchups = useQuery(api.playerManagement.getWeeklyMatchups,
    selectedDraftRoom ? {
      draftRoomId: selectedDraftRoom,
      year: selectedYear,
      week: selectedWeek,
    } : "skip"
  );

  // Get head-to-head standings
  const headToHeadStandings = useQuery(api.playerManagement.getHeadToHeadStandings,
    selectedDraftRoom ? {
      draftRoomId: selectedDraftRoom,
      year: selectedYear,
    } : "skip"
  );

  // Mutations
  const processMatchups = useMutation(api.playerManagement.processWeeklyMatchups);
  const calculateLeagueScores = useMutation(api.playerManagement.calculateLeagueWeeklyScores);

  const handleCalculateScores = async () => {
    if (!selectedDraftRoom) {
      setMessage("Please select a draft room first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await calculateLeagueScores({
        draftRoomId: selectedDraftRoom,
        year: selectedYear,
        week: selectedWeek,
      });
      setMessage(`✅ Calculated scores for ${result.length} users in week ${selectedWeek}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessMatchups = async () => {
    if (!selectedDraftRoom) {
      setMessage("Please select a draft room first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await processMatchups({
        draftRoomId: selectedDraftRoom,
        year: selectedYear,
        week: selectedWeek,
      });
      setMessage(`✅ Processed ${result.length} matchups for week ${selectedWeek}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAllWeeks = async () => {
    if (!selectedDraftRoom) {
      setMessage("Please select a draft room first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let totalProcessed = 0;
      
      for (let week = 1; week <= 8; week++) {
        // Calculate scores first
        await calculateLeagueScores({
          draftRoomId: selectedDraftRoom,
          year: selectedYear,
          week: week,
        });
        
        // Then process matchups
        const result = await processMatchups({
          draftRoomId: selectedDraftRoom,
          year: selectedYear,
          week: week,
        });
        
        totalProcessed += result.length;
        setMessage(`✅ Processing week ${week}... (${totalProcessed} matchups processed so far)`);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setMessage(`✅ Completed! Processed ${totalProcessed} total matchups across all 8 weeks`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Please sign in to access the demo</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Phase 6: Head-to-Head Matchups Demo</h1>
          <p className="mt-2 text-gray-600">
            Test the head-to-head matchup system with schedule creation, score calculation, and matchup processing
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Draft Room
              </label>
              <select
                value={selectedDraftRoom}
                onChange={(e) => setSelectedDraftRoom(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a draft room</option>
                {userDraftRooms?.map((room) => (
                  <option key={room._id} value={room._id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week
              </label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(week => (
                  <option key={week} value={week}>Week {week}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCalculateScores}
              disabled={loading || !selectedDraftRoom}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              1. Calculate Week {selectedWeek} Scores
            </button>

            <button
              onClick={handleProcessMatchups}
              disabled={loading || !selectedDraftRoom}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              2. Process Week {selectedWeek} Matchups
            </button>

            <button
              onClick={handleProcessAllWeeks}
              disabled={loading || !selectedDraftRoom}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              🚀 Process All 8 Weeks
            </button>
          </div>

          {message && (
            <div className={`mt-4 rounded-md p-3 ${
              message.startsWith('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Matchups */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Week {selectedWeek} Matchups
            </h2>
            
            {!weeklyMatchups ? (
              <div className="text-center py-8 text-gray-500">
                <p>Select a draft room to view matchups</p>
              </div>
            ) : weeklyMatchups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-lg">No matchups for Week {selectedWeek}</p>
                <p className="text-sm mt-2">Create a schedule first</p>
              </div>
            ) : (
              <div className="space-y-4">
                {weeklyMatchups.map((matchup: any) => (
                  <div key={matchup._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        {/* User 1 */}
                        <div className="flex-1 text-center">
                          <div className="font-medium text-gray-900">
                            {matchup.user1?.name || matchup.user1?.email || 'Unknown'}
                          </div>
                          <div className="text-2xl font-bold text-gray-900 mt-1">
                            {matchup.user1Score?.toFixed(2) || '0.00'}
                          </div>
                        </div>

                        {/* VS */}
                        <div className="text-gray-400 font-medium">VS</div>

                        {/* User 2 */}
                        <div className="flex-1 text-center">
                          <div className="font-medium text-gray-900">
                            {matchup.user2?.name || matchup.user2?.email || 'Unknown'}
                          </div>
                          <div className="text-2xl font-bold text-gray-900 mt-1">
                            {matchup.user2Score?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="ml-4">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          matchup.status === "COMPLETED" ? 'bg-green-100 text-green-800' :
                          matchup.status === "TIE" ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {matchup.status === "COMPLETED" && matchup.winnerId === matchup.user1Id ? 'User 1 Wins' :
                           matchup.status === "COMPLETED" && matchup.winnerId === matchup.user2Id ? 'User 2 Wins' :
                           matchup.status === "TIE" ? 'Tie' :
                           'Scheduled'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Head-to-Head Standings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Head-to-Head Standings
            </h2>
            
            {!headToHeadStandings ? (
              <div className="text-center py-8 text-gray-500">
                <p>Select a draft room to view standings</p>
              </div>
            ) : headToHeadStandings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">🏆</div>
                <p className="text-lg">No standings yet</p>
                <p className="text-sm mt-2">Process some matchups first</p>
              </div>
            ) : (
              <div className="space-y-3">
                {headToHeadStandings.map((standing: any) => (
                  <div key={standing.userId} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        standing.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                        standing.rank === 2 ? 'bg-gray-100 text-gray-800' :
                        standing.rank === 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {standing.rank}
                      </span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {standing.user?.name || standing.user?.email || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {standing.winPercentage}% win rate
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {standing.wins}-{standing.losses}
                        {standing.ties > 0 && `-${standing.ties}`}
                      </div>
                      <div className="text-sm text-gray-500">
                        +{standing.pointDifferential.toFixed(1)} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">How to test Phase 6:</h3>
          <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li>Select a completed draft room from the dropdown (schedule is automatically created when draft completes)</li>
            <li>Use "Calculate Week X Scores" to generate fantasy scores for a specific week</li>
            <li>Use "Process Week X Matchups" to determine winners based on scores</li>
            <li>Or use "Process All 8 Weeks" to simulate an entire season at once</li>
            <li>View the animated matchups and head-to-head standings</li>
            <li>Navigate to the full matchups page to see the complete interface with score animations</li>
            <li>For admin testing with schedule creation, use the dedicated admin panel at /admin/matchups-admin</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 