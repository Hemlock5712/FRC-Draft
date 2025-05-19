export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            About Fantasy FRC Draft
          </h1>
          <div className="prose prose-lg mx-auto text-gray-500">
            <p className="mb-4">
              Welcome to Fantasy FRC Draft, your premier destination for managing fantasy FRC drafts online. 
              Our platform provides a seamless, real-time drafting experience for FRC enthusiasts.
            </p>
            <p className="mb-4">
              Whether you're a seasoned FRC veteran or just getting started, 
              our platform offers the tools and features you need to run successful drafts:
            </p>
            <ul className="list-disc text-left max-w-2xl mx-auto space-y-2 mb-4">
              <li>Real-time draft rooms with live updates</li>
              <li>Comprehensive team database with statistics</li>
              <li>Customizable draft settings and rules</li>
              <li>Team management and analysis tools</li>
              <li>Mock draft functionality for practice</li>
              <li>Draft history and performance tracking</li>
            </ul>
            <p>
              Join us today and experience the future of FRC drafting!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 