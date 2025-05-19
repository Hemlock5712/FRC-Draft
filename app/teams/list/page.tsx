'use client';

import { useState, useEffect } from 'react';
import { Team } from '../../../lib/types/team';
import { Search, RefreshCw } from 'lucide-react';

interface TeamsResponse {
  teams: Team[];
  total: number;
  page: number;
  totalPages: number;
}

export default function TeamsListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [syncing, setSyncing] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '24',
        search: debouncedSearch,
      });

      const response = await fetch(`/api/teams/list?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data: TeamsResponse = await response.json();
      setTeams(data.teams);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'teams', force: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync teams');
      }

      // Refetch teams after sync
      await fetchTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync teams');
    } finally {
      setSyncing(false);
    }
  };

  // Fetch teams when page or search changes
  useEffect(() => {
    fetchTeams();
  }, [page, debouncedSearch]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">FRC Teams</h1>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Teams'}
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading && page === 1 ? (
        <div className="text-center py-12">
          <div className="text-xl">Loading teams...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-xl text-red-600">Error: {error}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">
                    Team {team.teamNumber}
                  </h3>
                  <h4 className="text-lg text-gray-700 mb-2">{team.name}</h4>
                  {(team.city || team.stateProv || team.country) && (
                    <p className="text-gray-600 text-sm">
                      {[team.city, team.stateProv, team.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                  
                  {team.seasonData && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Record</p>
                          <p className="font-medium">
                            {team.seasonData.wins}W - {team.seasonData.losses}L
                            {team.seasonData.ties > 0 && ` - ${team.seasonData.ties}T`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg RPs</p>
                          <p className="font-medium">{team.seasonData.avgRPs.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold">No teams found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your search query
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 