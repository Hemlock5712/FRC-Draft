export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8 animate-pulse">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-64 bg-gray-200 rounded"></div>
              <div className="mt-2 h-4 w-96 bg-gray-200 rounded"></div>
            </div>
            <div className="text-right">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Participants Skeleton */}
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div>
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="mt-2 h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Board Skeleton */}
          <div className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse">
                  <div>
                    <div className="h-5 w-48 bg-gray-200 rounded"></div>
                    <div className="mt-2 h-4 w-32 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 