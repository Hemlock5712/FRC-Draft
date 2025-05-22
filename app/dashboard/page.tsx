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
  privacy: string;
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

// Define the PublicRoom interface
interface PublicRoom {
  _id: string;
  name: string;
  description?: string | null;
  maxTeams: number;
  participantCount: number;
  hasSpace: boolean;
  creator: {
    name?: string | null;
    email?: string | null;
  };
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeRooms, setActiveRooms] = useState<DraftRoom[]>([]);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicRoomsLoading, setPublicRoomsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publicRoomsError, setPublicRoomsError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      console.log('Session user ID:', session.user.id);
      fetchDraftRooms();
      fetchPublicRooms();
    }
  }, [session]);

  const fetchDraftRooms = async () => {
    try {
      setLoading(true);
      console.log('Fetching draft rooms...');
      const response = await fetch('/api/draft/list');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Failed to fetch draft rooms:', response.status, errData);
        throw new Error(`Failed to fetch draft rooms: ${response.status}`);
      }
      const data = await response.json();
      console.log('Draft rooms API response:', data);
      
      // Check if data exists and has activeRooms array
      if (!data || !data.activeRooms) {
        console.log('No activeRooms in response');
        setActiveRooms([]);
        return;
      }

      // Check if the data structure is as expected in the Convex response
      // Convex sends back _id for documents but our interface expects id
      const rooms = data.activeRooms.map((room: any) => {
        // Map Convex _id to id for consistency with our interface
        if (room._id && !room.id) {
          return { ...room, id: room._id };
        }
        return room;
      });
      
      // Filter out any rooms without a valid ID
      const validRooms = Array.isArray(rooms) 
        ? rooms.filter((room: any) => room && (room.id || room._id)) 
        : [];
      
      console.log('Active rooms after filtering:', validRooms);
      setActiveRooms(validRooms);
    } catch (err) {
      console.error('Error in fetchDraftRooms:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicRooms = async () => {
    try {
      setPublicRoomsLoading(true);
      console.log('Fetching public rooms...');
      const response = await fetch('/api/draft/public');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Failed to fetch public rooms:', response.status, errData);
        throw new Error(`Failed to fetch public rooms: ${response.status}`);
      }
      const data = await response.json();
      console.log('Public rooms API response:', data);
      
      // Check if data exists and has publicRooms array
      if (!data || !data.publicRooms) {
        console.log('No publicRooms in response');
        setPublicRooms([]);
        return;
      }
      
      // Filter out any rooms without a valid ID
      const validPublicRooms = Array.isArray(data.publicRooms) 
        ? data.publicRooms.filter((room: any) => room && room._id) 
        : [];
      
      console.log('Public rooms after filtering:', validPublicRooms, 'Length:', validPublicRooms.length);
      setPublicRooms(validPublicRooms);
    } catch (err) {
      console.error('Error in fetchPublicRooms:', err);
      setPublicRoomsError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPublicRoomsLoading(false);
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
    if (!roomId) {
      setError('Invalid room ID');
      return;
    }
    
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

  const handleJoinPublicRoom = async (roomId: string) => {
    if (!roomId) {
      setPublicRoomsError("Invalid room ID");
      return;
    }
    
    setJoiningRoom(roomId);
    try {
      const response = await fetch(`/api/draft/${roomId}/join`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join draft room');
      }

      // Navigate to the draft room - ensure roomId is a string
      console.log('Navigating to:', `/draft/${roomId}`);
      router.push(`/draft/${roomId}`);
    } catch (err) {
      setPublicRoomsError(err instanceof Error ? err.message : 'Failed to join draft room');
    } finally {
      setJoiningRoom(null);
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
            <h2 className="text-xl font-semibold text-gray-900">Your Active Draft Rooms</h2>
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
                You haven't created or joined any draft rooms yet.
              </div>
            ) : (
              activeRooms.map((room) => (
                <div key={`active-${room.id}`} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <Link 
                        href={`/draft/${room.id}`} 
                        className="flex-1"
                        onClick={(e) => {
                          // Debug log and prevent default if no valid ID
                          if (!room.id) {
                            e.preventDefault();
                            console.error('Draft room ID is undefined or invalid:', room);
                          } else {
                            console.log('Navigating to draft room:', room.id);
                          }
                        }}
                      >
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
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${room.privacy === 'PUBLIC' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {room.privacy === 'PUBLIC' ? 'Public' : 'Private'}
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

        {/* Public Draft Rooms */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Available Public Draft Rooms</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {publicRoomsLoading ? (
              <div className="px-6 py-4 text-sm text-gray-500">
                Loading public draft rooms...
              </div>
            ) : publicRoomsError ? (
              <div className="px-6 py-4 text-sm text-red-500">
                Error: {publicRoomsError}
              </div>
            ) : publicRooms.length === 0 ? (
              <div className="px-6 py-4 text-sm text-gray-500 italic">
                No public draft rooms available right now.
              </div>
            ) : (
              publicRooms.map((room) => (
                <div key={`public-${room._id}`} className="block hover:bg-gray-50 transition-colors">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                        {room.description && (
                          <p className="mt-1 text-sm text-gray-500">{room.description}</p>
                        )}
                        <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                          <span>{room.participantCount} / {room.maxTeams} participants</span>
                          <span>•</span>
                          <span>Created by {room.creator.name || room.creator.email}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (room._id) {
                            console.log('Joining room:', room._id);
                            handleJoinPublicRoom(room._id);
                          } else {
                            console.error('Room ID is undefined:', room);
                            setPublicRoomsError('Invalid room ID');
                          }
                        }}
                        disabled={joiningRoom === room._id || !room.hasSpace}
                        className={`px-4 py-2 rounded-md text-sm font-medium ${
                          joiningRoom === room._id 
                            ? 'bg-blue-400 text-white cursor-not-allowed' 
                            : !room.hasSpace 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {joiningRoom === room._id ? 'Joining...' : !room.hasSpace ? 'Room Full' : 'Join'}
                      </button>
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