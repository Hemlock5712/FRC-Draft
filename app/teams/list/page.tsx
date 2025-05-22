'use client';

import { useState, useEffect, useCallback } from 'react';
// import { Team } from '../../../lib/types/team'; // Team type might come from Convex generated types or be adjusted
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from '@/convex/_generated/dataModel'; // Import Doc type

// Interface for what the component expects (could be a subset of Doc<"teams">)
export type TeamUIData = Doc<"teams">;

// TeamsResponse interface is no longer needed as usePaginatedQuery handles the structure

const ITEMS_PER_PAGE = 24;

export default function TeamsListPage() {
  // const [teams, setTeams] = useState<Team[]>([]); // Handled by usePaginatedQuery
  // const [loading, setLoading] = useState(true); // Handled by usePaginatedQuery status
  const [error, setError] = useState<string | null>(null); // Keep for other errors like sync
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to page 1 when search changes
      setPageInput('1');
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Use regular query instead of paginated query
  const queryResult = useQuery(
    api.teams.listTeamsWithSearchAndPagination, 
    { 
      search: debouncedSearch,
      page: currentPage,
      itemsPerPage: ITEMS_PER_PAGE
    }
  );

  const isLoading = queryResult === undefined;
  const teams = queryResult?.teams || [];
  const totalPages = queryResult?.totalPages || 1;

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'teams', force: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to sync teams');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync teams');
    } finally {
      setSyncing(false);
    }
  };

  // Handle page change
  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
    setPageInput(validPage.toString());
  };

  // Handle direct page input
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      goToPage(page);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">FRC Teams</h1>
          <button
            onClick={handleSync}
            disabled={syncing || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Teams'}
          </button>
        </div>
        
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams by name or number..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="text-xl">Loading teams...</div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-xl text-red-600">Error: {error}</div>
        </div>
      ) : (
        <>
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold">No teams found</h3>
              <p className="text-gray-600 mt-2">
                Try adjusting your search query or sync teams.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {teams.map((team: TeamUIData) => (
                  <div
                    key={team._id}
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
                      
                      {/* Assuming team.seasonData is part of Doc<"teams"> or joined in the query */}
                      {/* If seasonData is not directly on team, this part would need adjustment */}
                      {/* For now, assume it exists if `lib/types/team` had it and Doc<"teams"> schema includes it or similar */}
                      {/* team.seasonData && ( ... ) */}
                    </div>
                  </div>
                ))}
              </div>

              {/* Traditional Pagination Controls */}
              <div className="flex justify-center items-center mt-8 space-x-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isLoading}
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="flex items-center">
                  <span className="mx-2">Page</span>
                  <form onSubmit={handlePageInputSubmit} className="inline-flex items-center">
                    <input
                      type="text"
                      value={pageInput}
                      onChange={handlePageInputChange}
                      className="w-16 px-2 py-1 border rounded-md text-center"
                      aria-label="Go to page"
                    />
                    <span className="mx-2">of {totalPages}</span>
                    <button 
                      type="submit" 
                      className="px-2 py-1 bg-blue-600 text-white rounded-md"
                    >
                      Go
                    </button>
                  </form>
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isLoading}
                  className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
} 