'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';

export default function TeamFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const sortBy = searchParams.get('sort') || 'teamNumber';
  const sortOrder = searchParams.get('order') || 'asc';
  const region = searchParams.get('region') || 'all';

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (debouncedSearch) {
      params.set('q', debouncedSearch);
    } else {
      params.delete('q');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.push(newUrl);
  }, [debouncedSearch, router]);

  const updateSort = (newSortBy: string) => {
    const params = new URLSearchParams(searchParams);
    
    if (sortBy === newSortBy) {
      // Toggle order if clicking same sort field
      params.set('order', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sort', newSortBy);
      params.set('order', 'desc'); // Default to desc for new sort
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.push(newUrl);
  };

  const updateRegion = (newRegion: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('region', newRegion);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.push(newUrl);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teams..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Sort Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => updateSort('teamNumber')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              sortBy === 'teamNumber'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Number
            {sortBy === 'teamNumber' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => updateSort('avgRPs')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              sortBy === 'avgRPs'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Avg RPs
            {sortBy === 'avgRPs' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => updateSort('winRate')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 ${
              sortBy === 'winRate'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Win Rate
            {sortBy === 'winRate' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Region Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => updateRegion('all')}
            className={`px-3 py-1.5 rounded-lg ${
              region === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All Regions
          </button>
          <button
            onClick={() => updateRegion('na')}
            className={`px-3 py-1.5 rounded-lg ${
              region === 'na'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            North America
          </button>
          <button
            onClick={() => updateRegion('other')}
            className={`px-3 py-1.5 rounded-lg ${
              region === 'other'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            International
          </button>
        </div>
      </div>
    </div>
  );
} 