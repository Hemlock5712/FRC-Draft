'use client';

import { useState, useEffect } from 'react';

interface Team {
  key: string;
  teamNumber: number;
  name: string;
  city: string;
  stateProv: string;
  country: string;
  seasonData?: {
    wins: number;
    losses: number;
    ties: number;
    eventCount: number;
    totalRPs: number;
    avgRPs: number;
    totalMatchScore: number;
    avgMatchScore: number;
    regionalWins: number;
  };
}

export default function TeamsTestPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams/test');
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl">Loading teams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">FRC Teams - 2024 Season</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div
            key={team.key}
            className="bg-white shadow-lg rounded-lg overflow-hidden"
          >
            <div className="bg-blue-600 text-white px-4 py-2">
              <h2 className="text-xl font-bold">Team {team.teamNumber}</h2>
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{team.name}</h3>
              <p className="text-gray-600 mb-2">
                {[team.city, team.stateProv, team.country].filter(Boolean).join(', ')}
              </p>
              
              {team.seasonData && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">2024 Season Stats</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-medium">Record:</p>
                      <p>{team.seasonData.wins}W - {team.seasonData.losses}L - {team.seasonData.ties}T</p>
                    </div>
                    <div>
                      <p className="font-medium">Events:</p>
                      <p>{team.seasonData.eventCount}</p>
                    </div>
                    <div>
                      <p className="font-medium">Avg RPs:</p>
                      <p>{team.seasonData.avgRPs.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="font-medium">Avg Score:</p>
                      <p>{team.seasonData.avgMatchScore.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="font-medium">Regional Wins:</p>
                      <p>{team.seasonData.regionalWins}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 