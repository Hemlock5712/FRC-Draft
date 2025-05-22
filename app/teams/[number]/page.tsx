'use client'; // This component now uses client-side data fetching with SWR or similar

import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import TeamStats from '@/components/teams/TeamStats';
import TeamHeader from '@/components/teams/TeamHeader';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface Props {
  params: {
    number: string;
  };
}

// Metadata generation will need to be handled differently, perhaps in a parent layout or a server component wrapper
// For now, we'll provide a generic title. For dynamic metadata with client components, 
// you might need to update document.title in a useEffect hook or use a more advanced setup.
// export async function generateMetadata({ params }: Props): Promise<Metadata> {
//   // This needs to be a server-side call if you want dynamic metadata
//   // Or, fetch initial data on the server and pass to a client component
//   return {
//     title: `Team ${params.number} | Fantasy FRC Draft`,
//   };
// }

export default function TeamPage({ params }: Props) {
  const teamNumber = parseInt(params.number);

  const team = useQuery(api.teams.getTeamByNumber, { teamNumber });
  // We would also need a query to fetch seasonData similarly if it's a separate table and not embedded.
  // For this example, assuming team details include enough for TeamHeader and TeamStats
  // or that those components are also adapted for Convex.

  if (team === undefined) { // useQuery returns undefined while loading
    return <div className="container mx-auto px-4 py-8">Loading team data...</div>;
  }

  if (team === null) { // useQuery returns null if not found
    notFound();
  }

  // Assuming TeamStats and TeamHeader are adapted to take the Convex team object
  // You might need to adjust the props they expect or transform the `team` object here.
  const displayTeam = {
      ...team,
      seasonData: [], // Placeholder: Fetch or include actual seasonData as needed
      // Ensure all fields expected by TeamHeader and TeamStats are present
      // For example, if they expect `id` as string, and Convex provides `_id` as Id<"teams">:
      id: team._id.toString(), 
      teamNumber: team.teamNumber, // ensure this is part of your team object
      name: team.name,
      // ... other fields
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* @ts-ignore */}
      <TeamHeader team={displayTeam} />
      <div className="mt-8">
         {/* @ts-ignore */}
        <TeamStats team={displayTeam} />
      </div>
    </div>
  );
} 