'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DraftRoomFormData {
  name: string;
  description: string;
  maxTeams: number;
  pickTimeLimit: number;
  isSnakeDraft: boolean;
  privacy: 'PUBLIC' | 'PRIVATE';
  numberOfRounds: number;
  teamsToStart: number;
}

export default function CreateDraftRoom() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DraftRoomFormData>({
    name: '',
    description: '',
    maxTeams: 8,
    pickTimeLimit: 120,
    isSnakeDraft: true,
    privacy: 'PUBLIC',
    numberOfRounds: 8,
    teamsToStart: 5,
  });

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/draft/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          maxTeams: formData.maxTeams,
          pickTimeSeconds: formData.pickTimeLimit,
          snakeFormat: formData.isSnakeDraft,
          privacy: formData.privacy,
          numberOfRounds: formData.numberOfRounds,
          teamsToStart: formData.teamsToStart,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create draft room');
      }

      const data = await response.json();
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Create a Draft Room
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Room Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter room name"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter room description (optional)"
              />
            </div>

            <div>
              <label htmlFor="maxTeams" className="block text-sm font-medium text-gray-700">
                League Size (Even numbers only)
              </label>
              <input
                type="number"
                id="maxTeams"
                required
                min={2}
                max={32}
                step={2}
                value={formData.maxTeams || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 2;
                  // Ensure even number
                  const evenValue = value % 2 === 0 ? value : value - 1;
                  setFormData({ ...formData, maxTeams: Math.max(2, evenValue) });
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Only even numbers are allowed (2, 4, 6, 8, etc.)
              </p>
            </div>

            <div>
              <label htmlFor="numberOfRounds" className="block text-sm font-medium text-gray-700">
                Number of Rounds
              </label>
              <input
                type="number"
                id="numberOfRounds"
                required
                min={1}
                max={20}
                value={formData.numberOfRounds || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setFormData({ ...formData, numberOfRounds: Math.max(1, Math.min(20, value)) });
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="teamsToStart" className="block text-sm font-medium text-gray-700">
                Teams to Start
              </label>
              <input
                type="number"
                id="teamsToStart"
                required
                min={1}
                max={15}
                value={formData.teamsToStart || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setFormData({ ...formData, teamsToStart: Math.max(1, Math.min(15, value)) });
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="pickTime" className="block text-sm font-medium text-gray-700">
                Pick Time (seconds)
              </label>
              <input
                type="number"
                id="pickTime"
                required
                min={30}
                max={300}
                value={formData.pickTimeLimit || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 30;
                  setFormData({ ...formData, pickTimeLimit: Math.max(30, Math.min(300, value)) });
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isSnakeDraft"
                checked={formData.isSnakeDraft}
                onChange={(e) => setFormData({ ...formData, isSnakeDraft: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isSnakeDraft" className="ml-2 block text-sm text-gray-700">
                Enable Snake Draft Format
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Privacy
              </label>
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="privacyPublic"
                    name="privacy"
                    value="PUBLIC"
                    checked={formData.privacy === 'PUBLIC'}
                    onChange={() => setFormData({ ...formData, privacy: 'PUBLIC' })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="privacyPublic" className="ml-2 block text-sm text-gray-700">
                    Public (Anyone can join)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="privacyPrivate"
                    name="privacy"
                    value="PRIVATE"
                    checked={formData.privacy === 'PRIVATE'}
                    onChange={() => setFormData({ ...formData, privacy: 'PRIVATE' })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="privacyPrivate" className="ml-2 block text-sm text-gray-700">
                    Private (Only with invite)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Draft Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 