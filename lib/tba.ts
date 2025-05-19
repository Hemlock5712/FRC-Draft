import axios from 'axios';
import { TBATeam, TBATeamSimple, TBAEvent, TBAEventStatus } from './types/tba';

const TBA_BASE_URL = 'https://www.thebluealliance.com/api/v3';

interface TBARequestOptions {
  path: string;
  params?: Record<string, string>;
}

export async function tbaRequest<T>({ path, params }: TBARequestOptions): Promise<T> {
  const apiKey = process.env.TBA_API_KEY;
  if (!apiKey) {
    throw new Error('TBA_API_KEY is not set in environment variables');
  }

  const url = new URL(`${TBA_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-TBA-Auth-Key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TBA API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getTeam(teamNumber: number) {
  return tbaRequest<TBATeam>({
    path: `/team/frc${teamNumber}`,
  });
}

export async function getTeamEvents(teamNumber: number, year: number) {
  return tbaRequest<TBAEvent[]>({
    path: `/team/frc${teamNumber}/events/${year}`,
  });
}

export async function getTeamEventStatus(teamNumber: number, eventKey: string) {
  return tbaRequest<TBAEventStatus>({
    path: `/team/frc${teamNumber}/event/${eventKey}/status`,
  });
}

export async function getTeamEventMatches(teamNumber: number, eventKey: string) {
  return tbaRequest<any[]>({
    path: `/team/frc${teamNumber}/event/${eventKey}/matches`,
  });
}

export async function getTeamsPage(page: number) {
  // TBA API uses 0-based page numbers internally
  const pageIndex = page - 1;
  return tbaRequest<TBATeamSimple[]>({
    path: `/teams/${pageIndex}/simple`,
  });
}

export async function getTeamsByYear(year: number, page: number) {
  // TBA API uses 0-based page numbers internally
  const pageIndex = page - 1;
  return tbaRequest<TBATeamSimple[]>({
    path: `/teams/${year}/${pageIndex}/simple`,
  });
}

export async function getDistrictRankings(districtKey: string) {
  return tbaRequest<any[]>({
    path: `/district/${districtKey}/rankings`,
  });
}

// Export a default client instance for convenience
export default {
  getTeam,
  getTeamEvents,
  getTeamEventStatus,
  getTeamEventMatches,
  getTeamsPage,
  getTeamsByYear,
  getDistrictRankings,
}; 