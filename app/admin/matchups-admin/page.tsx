"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "next-auth/react";

export default function MatchupsAdminPage() {
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

  // Get detailed roster information with team scores
  const detailedRosters = useQuery(api.playerManagement.getDetailedRosterWithScores,
    selectedDraftRoom ? {
      draftRoomId: selectedDraftRoom,
      year: selectedYear,
      week: selectedWeek,
    } : "skip"
  );

  // Get team performance data for debugging
  const teamPerformanceData = useQuery(api.playerManagement.getTeamPerformanceData, {
    year: selectedYear,
    week: selectedWeek,
    limit: 10,
  });

  // Debug roster issues
  const rosterDebugData = useQuery(api.playerManagement.debugRosterIssues,
    selectedDraftRoom ? {
      draftRoomId: selectedDraftRoom,
      year: selectedYear,
      week: selectedWeek,
    } : "skip"
  );

  // Check data flow from TBA to league scores
  const dataFlowCheck = useQuery(api.playerManagement.checkDataFlow, {
    year: selectedYear,
    week: selectedWeek,
    draftRoomId: selectedDraftRoom || undefined,
  });

  // Mutations
  const createSchedule = useMutation(api.playerManagement.createSeasonSchedule);
  const processMatchups = useMutation(api.playerManagement.processWeeklyMatchups);
  const calculateLeagueScores = useMutation(api.playerManagement.calculateLeagueWeeklyScores);
  const generateTeamPerformances = useMutation(api.playerManagement.generateTeamDataInChunks);
  const populateTestRosters = useMutation(api.playerManagement.populateTestRosters);
  const clearTeamData = useMutation(api.playerManagement.clearTeamPerformanceData);
  
  // TBA Actions
  const fetchRealTBADataAction = useAction(api.tbaActions.fetchRealTBADataAction);
  const testTBAConnectionAction = useAction(api.tbaActions.testTBAConnectionAction);
  const debugTBAEventAction = useAction(api.tbaActions.debugTBAEventProcessingAction);

  const handleCreateSchedule = async () => {
    if (!selectedDraftRoom) {
      setMessage("Please select a draft room first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await createSchedule({
        draftRoomId: selectedDraftRoom,
        year: selectedYear,
        totalWeeks: 8,
      });
      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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

  const handleGenerateTeamData = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await generateTeamPerformances({
        year: selectedYear,
        week: selectedWeek,
        chunkSize: 25,
      });
      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateTestRosters = async () => {
    if (!selectedDraftRoom) {
      setMessage("Please select a draft room first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await populateTestRosters({
        draftRoomId: selectedDraftRoom,
        year: selectedYear,
        week: selectedWeek,
      });
      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearTeamData = async () => {
    if (!confirm(`Are you sure you want to clear team data for ${selectedYear} Week ${selectedWeek}? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await clearTeamData({
        year: selectedYear,
        week: selectedWeek,
      });
      setMessage(`✅ ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };



  const handleTestTBAConnection = async () => {
    setLoading(true);
    setMessage("");

    try {
      const result = await testTBAConnectionAction({});
      setMessage(`${result.success ? '✅' : '❌'} ${result.message}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugSingleEvent = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Use a known 2024 Week 1 event for debugging
      const result = await debugTBAEventAction({
        eventKey: "2024mndu",
        year: selectedYear,
        week: selectedWeek,
      });
      
      if (result.success) {
        setMessage(`✅ Debug: ${result.message}\n📊 Event: ${result.eventKey}\n👥 Teams: ${result.totalTeams}, Matches: ${result.completedMatches}\n🏆 Processed: ${result.teamsProcessed} teams, ${result.performancesCreated} performances\n📋 Sample teams: ${result.sampleTeams?.map(t => `${t.number} (${t.key})`).join(', ')}`);
      } else {
        setMessage(`❌ Debug failed: ${result.message}\n${result.error ? `Error: ${result.error}` : ''}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCurrentWeekData = async () => {
    if (!confirm(`Are you sure you want to clear Week ${selectedWeek} data for ${selectedYear}? This will allow fresh TBA data to be processed.`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await clearTeamData({
        year: selectedYear,
        week: selectedWeek,
      });
      setMessage(`✅ ${result.message} - Now you can test TBA integration fresh for Week ${selectedWeek}!`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearEntireYear = async () => {
    if (!confirm(`Are you sure you want to clear ALL data for ${selectedYear}? This will delete all team performances and weekly scores for the entire year. This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await clearTeamData({
        year: selectedYear,
      });
      setMessage(`✅ ${result.message} - Year ${selectedYear} cleared completely!`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadEntireYear = async () => {
    if (!confirm(`Are you sure you want to load TBA data for ALL weeks of ${selectedYear}? This will take several minutes and process weeks 1-8.`)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      let totalEvents = 0;
      let totalTeams = 0;
      let totalPerformances = 0;
      let totalWeeklyScores = 0;
      let successfulWeeks = 0;

      for (let week = 1; week <= 8; week++) {
        try {
          setMessage(`📡 Processing Week ${week}/8... Please wait...`);
          
          const result = await fetchRealTBADataAction({
            year: selectedYear,
            week: week,
            // No maxEvents limit - process all events
          });
          
          if (result.success) {
            totalEvents += result.eventsProcessed || 0;
            totalTeams += result.teamsProcessed || 0;
            totalPerformances += result.performancesCreated || 0;
            totalWeeklyScores += result.weeklyScoresCalculated || 0;
            successfulWeeks++;
          }
          
          // Small delay between weeks to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (weekError) {
          console.error(`Error processing week ${week}:`, weekError);
          // Continue with next week
        }
      }

      setMessage(`✅ Loaded ${successfulWeeks}/8 weeks successfully!\n📊 Total: ${totalEvents} events, ${totalTeams} teams, ${totalPerformances} performances, ${totalWeeklyScores} weekly scores`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchRealTBAData = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Step 1: Fetch TBA data and calculate weekly scores
      setMessage("📡 Fetching TBA data and calculating weekly scores...");
      const result = await fetchRealTBADataAction({
        year: selectedYear,
        week: selectedWeek,
        // No maxEvents limit - process all events
      });
      
      if (!result.success) {
        setMessage(`❌ ${result.message}`);
        return;
      }

      let finalMessage = `✅ ${result.message}\n📊 Events: ${result.eventsProcessed}/${result.eventsFound}, Teams: ${result.teamsProcessed}, Performances: ${result.performancesCreated}, Weekly Scores: ${result.weeklyScoresCalculated || 0}`;

      // Step 2: If a draft room is selected, also calculate league scores
      if (selectedDraftRoom && result.weeklyScoresCalculated && result.weeklyScoresCalculated > 0) {
        try {
          setMessage(finalMessage + "\n🏆 Calculating league scores...");
          
          const leagueResult = await calculateLeagueScores({
            draftRoomId: selectedDraftRoom,
            year: selectedYear,
            week: selectedWeek,
          });
          
          finalMessage += `\n🏆 League scores calculated for ${leagueResult.length} users`;
        } catch (leagueError) {
          finalMessage += `\n⚠️ League scores calculation failed: ${leagueError instanceof Error ? leagueError.message : 'Unknown error'}`;
        }
      } else if (selectedDraftRoom) {
        finalMessage += "\n⚠️ No weekly scores available for league calculation";
      } else {
        finalMessage += "\n💡 Select a draft room to also calculate league scores";
      }

      setMessage(finalMessage);
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

  const handleDeleteSchedule = async () => {
    if (!selectedDraftRoom) {
      setMessage("Please select a draft room first");
      return;
    }

    if (!confirm("Are you sure you want to delete the entire schedule? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Note: You would need to implement a deleteSchedule mutation
      setMessage("⚠️ Delete schedule functionality not implemented yet");
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Please sign in to access the admin panel</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Matchups Admin Panel</h1>
          <p className="mt-2 text-gray-600">
            Admin tools for managing head-to-head matchup schedules and processing
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

          {/* Workflow Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-medium text-blue-900 mb-2">📋 Complete Workflow</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li><strong>Fetch Real TBA Data</strong> - Gets actual historical FRC events and match results, automatically calculates weekly scores</li>
              <li><strong>Populate Test Rosters</strong> - Assigns teams to users with multi-week participation</li>
              <li><strong>Create Schedule</strong> - Generates head-to-head matchups for the season</li>
              <li><strong>Calculate & Process</strong> - Calculate league scores and process matchups for each week</li>
              <li><strong>Automation</strong> - Use "Process All 8 Weeks" for full season simulation</li>
            </ol>
          </div>

          <div className="space-y-4">
            {/* Real TBA Data */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">🏆 Real TBA Data (Recommended)</h3>
              
              {/* Single Week Operations */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Single Week Operations</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleFetchRealTBAData}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    📡 Fetch Real TBA Data for Week {selectedWeek}
                  </button>
                  <button
                    onClick={handleClearCurrentWeekData}
                    disabled={loading}
                    className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    🗑️ Clear Week {selectedWeek} Data
                  </button>
                </div>
              </div>

              {/* Full Year Operations */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Full Year Operations</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleLoadEntireYear}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    📅 Load Entire {selectedYear} Season (Weeks 1-8)
                  </button>
                  <button
                    onClick={handleClearEntireYear}
                    disabled={loading}
                    className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    🗑️ Clear Entire {selectedYear} Year
                  </button>
                </div>
              </div>

              {/* Debug Operations */}
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Debug & Testing</h4>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleTestTBAConnection}
                    disabled={loading}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    🔍 Test Connection
                  </button>
                  <button
                    onClick={handleDebugSingleEvent}
                    disabled={loading}
                    className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    🐛 Debug Single Event
                  </button>
                </div>
              </div>
              
                            {/* TBA Status - Simplified */}
              <div className="bg-blue-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-blue-800">
                  <strong>TBA API Integration:</strong> Will fetch real historical FRC event data from The Blue Alliance.
                </p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>✅ TBA Integration Active:</strong> Fetches real historical FRC event data from The Blue Alliance API. 
                  Automatically processes team performances, calculates fantasy points, and stores weekly scores.
                </p>
                <p className="text-xs text-green-700 mt-1">
                  <strong>Note:</strong> Clear operations only remove performance data and scores, never the actual team records. 
                  Teams are safely preserved and will be reused when processing new data.
                </p>
              </div>
            </div>

            {/* Team Data Generation */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">🎲 Fake Data Generation (Testing)</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateTeamData}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  🎯 Generate Week {selectedWeek} Data (300 teams selected + scores)
                </button>
                
                <button
                  onClick={handlePopulateTestRosters}
                  disabled={loading || !selectedDraftRoom}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  👥 Populate Test Rosters
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Generate realistic team data (only ~300 teams compete per week), then populate rosters with teams that have multi-week participation. Use clear functions to reset data for testing.
              </p>
            </div>

            {/* Schedule Management */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule Management</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCreateSchedule}
                  disabled={loading || !selectedDraftRoom}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Create New Schedule
                </button>

                <button
                  onClick={handleDeleteSchedule}
                  disabled={loading || !selectedDraftRoom}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Delete Schedule
                </button>
              </div>
            </div>

            {/* Week Processing */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Week Processing</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCalculateScores}
                  disabled={loading || !selectedDraftRoom}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Calculate Week {selectedWeek} Scores
                </button>

                <button
                  onClick={handleProcessMatchups}
                  disabled={loading || !selectedDraftRoom}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Process Week {selectedWeek} Matchups
                </button>
              </div>
            </div>

            {/* Bulk Operations */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Bulk Operations</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleProcessAllWeeks}
                  disabled={loading || !selectedDraftRoom}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  🚀 Process All 8 Weeks
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mt-4 rounded-md p-3 ${
              message.startsWith('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : message.startsWith('⚠️')
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}
        </div>

        {/* Data Flow Check */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Data Flow Status - {selectedYear} Week {selectedWeek}
          </h2>
          
          {!dataFlowCheck ? (
            <div className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {dataFlowCheck.counts.teamPerformances}
                  </div>
                  <div className="text-sm text-blue-700">Team Performances</div>
                  <div className="text-xs text-blue-600 mt-1">
                    From TBA events & matches
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dataFlowCheck.counts.weeklyScores}
                  </div>
                  <div className="text-sm text-green-700">Weekly Team Scores</div>
                  <div className="text-xs text-green-600 mt-1">
                    Calculated from performances
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {dataFlowCheck.counts.leagueScores}
                  </div>
                  <div className="text-sm text-purple-700">League User Scores</div>
                  <div className="text-xs text-purple-600 mt-1">
                    {selectedDraftRoom ? "From user rosters" : "Select draft room"}
                  </div>
                </div>
              </div>

              {dataFlowCheck.samples.teamPerformances.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Sample Team Performance</h3>
                  <div className="bg-gray-50 p-3 rounded text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>Team:</strong> {dataFlowCheck.samples.teamPerformances[0]?.teamId}</div>
                      <div><strong>Event:</strong> {dataFlowCheck.samples.teamPerformances[0]?.eventKey}</div>
                      <div><strong>Points:</strong> {dataFlowCheck.samples.teamPerformances[0]?.totalPoints}</div>
                      <div><strong>Record:</strong> {dataFlowCheck.samples.teamPerformances[0]?.qualWins}W-{dataFlowCheck.samples.teamPerformances[0]?.qualLosses}L</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Roster Debug Information */}
        {selectedDraftRoom && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Roster Debug Information - Week {selectedWeek}
            </h2>
            
            {!rosterDebugData ? (
              <div className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {rosterDebugData.participantCount}
                    </div>
                    <div className="text-sm text-blue-700">Participants</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {rosterDebugData.totalRosterEntries}
                    </div>
                    <div className="text-sm text-green-700">Total Roster Entries</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {rosterDebugData.rosterEntriesPerUser.toFixed(1)}
                    </div>
                    <div className="text-sm text-purple-700">Teams per User</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {rosterDebugData.totalWeeklyScoresForWeek}
                    </div>
                    <div className="text-sm text-orange-700">Weekly Scores Available</div>
                  </div>
                </div>
                
                {rosterDebugData.sampleTeamLookups.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Team Lookups</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exists in DB</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Has Weekly Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Points</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rosterDebugData.sampleTeamLookups.map((lookup: any) => (
                            <tr key={lookup.teamId}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {lookup.teamId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  lookup.teamExists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {lookup.teamExists ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {lookup.teamData?.teamNumber || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  lookup.hasWeeklyScore ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {lookup.hasWeeklyScore ? 'Yes' : 'No'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {lookup.weeklyPoints.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {rosterDebugData.sampleRosterEntries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Roster Entries</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Starting</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rosterDebugData.sampleRosterEntries.map((entry: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {entry.userId.slice(-8)}...
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.teamId}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.isStarting ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {entry.isStarting ? 'Starting' : 'Bench'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {entry.acquisitionType}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Team Performance Debug Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Team Performance Debug - Week {selectedWeek}
          </h2>
          
          {!teamPerformanceData ? (
            <div className="animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {teamPerformanceData.totalPerformancesCount}
                  </div>
                  <div className="text-sm text-blue-700">Team Performances</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {teamPerformanceData.totalWeeklyScoresCount}
                  </div>
                  <div className="text-sm text-green-700">Weekly Team Scores</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {teamPerformanceData.performances.length}
                  </div>
                  <div className="text-sm text-purple-700">Sample Performances</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {teamPerformanceData.weeklyScores.length}
                  </div>
                  <div className="text-sm text-orange-700">Sample Weekly Scores</div>
                </div>
              </div>
              
              {teamPerformanceData.performances.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Team Performances</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Points</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qual W-L</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playoffs</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamPerformanceData.performances.slice(0, 5).map((perf: any) => (
                          <tr key={`${perf.teamId}-${perf.eventKey}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {perf.teamId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {perf.eventKey}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {perf.totalPoints.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {perf.qualWins}-{perf.qualLosses}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {perf.madePlayoffs ? `${perf.playoffWins}-${perf.playoffLosses}` : 'No'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {teamPerformanceData.weeklyScores.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Weekly Scores</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Points</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Season Points</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {teamPerformanceData.weeklyScores.slice(0, 5).map((score: any) => (
                          <tr key={`${score.teamId}-${score.week}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {score.teamId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {score.weeklyPoints.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {score.seasonPoints.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {score.eventsCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Roster Information */}
        {selectedDraftRoom && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Week {selectedWeek} Starting Teams & Points
            </h2>
            
            {!detailedRosters ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : detailedRosters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-lg">No roster data found</p>
                <p className="text-sm mt-2">Make sure users have drafted teams</p>
              </div>
            ) : (
              <div className="space-y-6">
                {detailedRosters.map((roster: any) => (
                  <div key={roster.userId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="font-semibold text-gray-900">
                          {roster.user?.name || roster.user?.email || 'Unknown User'}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {roster.totalStartingPoints} pts
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {roster.startingTeamCount} starting teams
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {roster.teams.map((team: any) => (
                        <div 
                          key={team.teamId} 
                          className={`rounded-lg p-3 border-2 ${
                            team.isStarting 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2">
                                <div className="font-medium text-gray-900">
                                  {team.teamNumber}
                                </div>
                                {team.isStarting && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Starting
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 truncate">
                                {team.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {team.acquisitionType}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${
                                team.weeklyPoints > 15 ? 'text-green-600' :
                                team.weeklyPoints > 10 ? 'text-blue-600' :
                                team.weeklyPoints > 5 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {team.weeklyPoints.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">pts</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
          <h3 className="text-lg font-medium text-blue-900 mb-3">Admin Instructions:</h3>
          <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
            <li><strong>Team Data Generation:</strong> Generate performance data for teams in database and calculate weekly scores</li>

            <li><strong>Schedule Management:</strong> Create new schedules or delete existing ones for testing</li>
            <li><strong>Week Processing:</strong> Calculate league scores and process individual weeks</li>
            <li><strong>Bulk Operations:</strong> Process all 8 weeks at once for full season simulation</li>
            <li><strong>Complete Workflow:</strong> 1) Generate team data (use "Reasonable" for best performance) → 2) Calculate team scores → 3) Create schedule → 4) Calculate league scores → 5) Process matchups</li>
            <li><strong>Performance Note:</strong> Use "Reasonable Season Data" for 500 teams to avoid hitting database limits. "ALL Teams" may fail with large datasets.</li>
            <li><strong>Note:</strong> Schedules are automatically created when drafts complete in production</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 