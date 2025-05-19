import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Metadata } from 'next';
import TeamStats from '@/components/teams/TeamStats';
import TeamHeader from '@/components/teams/TeamHeader';

interface Props {
  params: {
    number: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await prisma.team.findFirst({
    where: { teamNumber: parseInt(params.number) },
  });

  if (!team) {
    return {
      title: 'Team Not Found | Fantasy FRC Draft',
    };
  }

  return {
    title: `Team ${team.teamNumber} - ${team.name} | Fantasy FRC Draft`,
    description: `View detailed statistics and performance history for FRC Team ${team.teamNumber} (${team.name})`,
  };
}

export default async function TeamPage({ params }: Props) {
  const team = await prisma.team.findFirst({
    where: { teamNumber: parseInt(params.number) },
    include: {
      seasonData: true,
    },
  });

  if (!team) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TeamHeader team={team} />
      <div className="mt-8">
        <TeamStats team={team} />
      </div>
    </div>
  );
} 