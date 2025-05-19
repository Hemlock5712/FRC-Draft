'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import TeamCard from './TeamCard';
import { Team } from '@/lib/types/team';

export default function TeamsList() {
  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const teamsPerPage = 24;

  // Get filter values from URL params
  const sortBy = searchParams.get('sort') || 'teamNumber';
  const sortOrder = searchParams.get('order') || 'asc';
  const filterRegion = searchParams.get('region') || 'all';
  const searchQuery = searchParams.get('q') || '';

  useEffect(() => {
    fetchTeams();
  }, [page, sortBy, sortOrder, filterRegion, searchQuery]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: teamsPerPage.toString(),
        sort: sortBy,
        order: sortOrder,
        region: filterRegion,
        search: searchQuery,
      });

      const response = await fetch(`/api/teams?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      setTeams(data.teams);
      setTotalPages(Math.ceil(data.total / teamsPerPage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-xl">Loading teams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold">No teams found</h3>
          <p className="text-gray-600 mt-2">
            Try adjusting your filters or search query
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-6">
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
    </div>
  );
} 