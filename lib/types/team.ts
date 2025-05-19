export interface Team {
  id: string;
  teamNumber: number;
  name: string;
  city: string | null;
  stateProv: string | null;
  country: string | null;
  rookieYear: number | null;
  website: string | null;
  seasonData: TeamSeasonData | null;
}

export interface TeamSeasonData {
  wins: number;
  losses: number;
  ties: number;
  eventCount: number;
  totalRPs: number;
  avgRPs: number;
  totalMatchScore: number;
  avgMatchScore: number;
  regionalWins: number;
  districtRank: number | null;
} 