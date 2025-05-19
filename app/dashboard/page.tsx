'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DraftRoom {
  id: string;
  name: string;
  description: string | null;
  status: string;
  maxTeams: number;
  pickTimeSeconds: number;
  snakeFormat: boolean;
  createdBy: string;
  creator: {
    id: string;
    name: string | null;
    email: string | null;
  };
  DraftParticipant: {
    user: {
      name: string | null;
      email: string | null;
    };
    isReady: boolean;
  }[];
  _count: {
    DraftPick: number;
    DraftParticipant?: number;
  };
  createdAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeRooms, setActiveRooms] = useState<DraftRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDraftRooms();
    }
  }, [session]);

  const fetchDraftRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/draft/list');
      if (!response.ok) {
        throw new Error('Failed to fetch draft rooms');
      }
      const data = await response.json();
      setActiveRooms(data.activeRooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this draft room? This action cannot be undone.')) {
      return;
    }

    setDeleteLoading(roomId);
    try {
      const response = await fetch(`/api/draft/delete?id=${roomId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete draft room');
      }

      // Remove the deleted room from the state
      setActiveRooms(rooms => rooms.filter(room => room.id !== roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft room');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {session?.user?.name || 'User'}!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your fantasy FRC drafts and explore teams
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/draft/create"
            className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Draft</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Start a new draft room and invite participants
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/teams/list"
            className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Browse Teams</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Explore FRC teams and their statistics
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Active Draft Rooms */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Your Draft Rooms</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-4 text-sm text-gray-500">
                Loading draft rooms...
              </div>
            ) : error ? (
              <div className="px-6 py-4 text-sm text-red-500">
                Error: {error}
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="px-6 py-4 text-sm text-gray-500 italic">
                No draft rooms available yet. Create one to get started!
              </div>
            ) : (
              activeRooms.map((room) => (
                <div key={room.id} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/draft/${room.id}`} className="flex-1">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                          {room.description && (
                            <p className="mt-1 text-sm text-gray-500">{room.description}</p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                          <span>{room.DraftParticipant.length} / {room.maxTeams} participants</span>
                          <span>•</span>
                          <span>{room._count.DraftPick} picks made</span>
                          <span>•</span>
                          <span>Created by {room.creator.name || room.creator.email}</span>
                        </div>
                      </Link>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                          {room.status}
                        </span>
                        {session?.user?.id === room.createdBy && (
                          <button
                            onClick={() => handleDelete(room.id)}
                            disabled={deleteLoading === room.id}
                            className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                            title="Delete draft room"
                          >
                            {deleteLoading === room.id ? (
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 