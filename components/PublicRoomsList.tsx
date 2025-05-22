'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Id } from "../convex/_generated/dataModel";

export default function PublicRoomsList() {
  const { data: session } = useSession();
  const router = useRouter();
  const [joiningRoom, setJoiningRoom] = useState<Id<"draftRooms"> | null>(null);

  // Use Convex query to get public rooms
  const publicRooms = useQuery(api.draftRooms.listPublicDraftRooms, { 
    userId: session?.user?.id || '' 
  });
  
  // Use Convex mutation to join a room
  const joinRoom = useMutation(api.draftRooms.joinDraftRoom);

  const handleJoinRoom = async (roomId: Id<"draftRooms">) => {
    if (!session?.user?.id) return;
    if (!roomId) {
      console.error('Room ID is undefined');
      return;
    }
    
    setJoiningRoom(roomId);
    try {
      await joinRoom({ roomId, userId: session.user.id });
      // Navigate to the room page - using string conversion to ensure it's not undefined
      const roomIdString = roomId.toString();
      console.log('Navigating to:', `/draft/${roomIdString}`);
      router.push(`/draft/${roomIdString}`);
    } catch (error) {
      console.error('Failed to join room:', error);
      alert('Failed to join room: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setJoiningRoom(null);
    }
  };

  if (!publicRooms?.publicRooms || publicRooms.publicRooms.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-center">
        No public draft rooms available right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {publicRooms.publicRooms.map((room) => (
        <div key={room._id} className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold">{room.name}</h3>
          {room.description && <p className="text-gray-600 mt-1">{room.description}</p>}
          
          <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
            <span>{room.participantCount} / {room.maxTeams} participants</span>
            <span>•</span>
            <span>Created by {room.creator?.name || room.creator?.email || 'Unknown'}</span>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleJoinRoom(room._id)}
              disabled={joiningRoom === room._id || !room.hasSpace}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                !room.hasSpace 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : joiningRoom === room._id 
                    ? 'bg-blue-400 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {joiningRoom === room._id ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </span>
              ) : !room.hasSpace ? (
                'Room Full'
              ) : (
                'Join Room'
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 