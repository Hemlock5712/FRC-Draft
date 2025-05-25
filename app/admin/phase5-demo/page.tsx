"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Phase5DemoPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [draftRoomId, setDraftRoomId] = useState("");

  const calculateLeagueWeeklyScores = useMutation(api.playerManagement.calculateLeagueWeeklyScores);
  const calculateWeeklyScores = useMutation(api.playerManagement.calculateWeeklyScores);

  const handleCalculateWeeklyScores = async () => {
    if (!selectedYear || !selectedWeek) {
      setMessage("Please select year and week");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // First calculate team weekly scores
      const teamResults = await calculateWeeklyScores({
        year: selectedYear,
        week: selectedWeek,
      });

      setMessage(`✅ Calculated weekly scores for ${teamResults.length} teams for Week ${selectedWeek}, ${selectedYear}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateLeagueScores = async () => {
    if (!draftRoomId || !selectedYear || !selectedWeek) {
      setMessage("Please provide draft room ID, year, and week");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const results = await calculateLeagueWeeklyScores({
        draftRoomId,
        year: selectedYear,
        week: selectedWeek,
      });

      setMessage(`✅ Calculated league scores for ${results.length} participants in Week ${selectedWeek}, ${selectedYear}`);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Phase 5: League Management Demo</h1>
          <p className="mt-2 text-gray-600">
            Test and demonstrate Phase 5 league scoring and analytics features
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Calculate Weekly Scores</h2>
          <p className="text-sm text-gray-600 mb-4">
            Calculate team performance scores for a specific week. This processes all team event performances 
            and generates weekly point totals.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                min="2020"
                max="2030"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Week
              </label>
              <input
                type="number"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                min="1"
                max="8"
              />
            </div>
          </div>

          <button
            onClick={handleCalculateWeeklyScores}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Calculate Team Weekly Scores'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Calculate League Scores</h2>
          <p className="text-sm text-gray-600 mb-4">
            Calculate fantasy league scores for all participants in a specific draft room/league. 
            This uses each participant's starting lineup to calculate their weekly points.
          </p>
          
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Draft Room ID
              </label>
              <input
                type="text"
                value={draftRoomId}
                onChange={(e) => setDraftRoomId(e.target.value)}
                placeholder="Enter draft room ID (e.g., from URL)"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find this in the URL when viewing a completed draft room
              </p>
            </div>
          </div>

          <button
            onClick={handleCalculateLeagueScores}
            disabled={loading || !draftRoomId}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Calculate League Scores'}
          </button>
        </div>

        {message && (
          <div className={`rounded-md p-4 mb-8 ${
            message.startsWith('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Phase 5 Features Overview</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900">League Scoring System</h3>
              <p className="text-sm text-gray-600">
                Automatically calculates weekly fantasy scores based on team performance at FRC events.
                Uses the Phase 4 scoring system (12 base points + qualification/playoff bonuses).
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900">League Standings & Analytics</h3>
              <p className="text-sm text-gray-600">
                Comprehensive league standings with weekly/season totals, averages, best/worst weeks.
                Detailed analytics including score distributions and weekly performance trends.
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-semibold text-gray-900">Team Performance Projections</h3>
              <p className="text-sm text-gray-600">
                Advanced analytics that project future team performance based on historical data,
                trends, and statistical confidence intervals.
              </p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-gray-900">User Performance History</h3>
              <p className="text-sm text-gray-600">
                Track individual user performance across weeks with running totals,
                trends, and detailed breakdowns of team contributions.
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">How to Test Phase 5:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>First, ensure you have team event performance data (Phase 4)</li>
              <li>Calculate weekly team scores using the form above</li>
              <li>Create a completed draft room with participants and roster data</li>
              <li>Calculate league scores for that draft room</li>
              <li>Visit the league analytics page to see standings and analytics</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 