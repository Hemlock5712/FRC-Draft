export interface TBATeam {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
  city: string | null;
  state_prov: string | null;
  country: string | null;
  address: string | null;
  postal_code: string | null;
  gmaps_place_id: string | null;
  gmaps_url: string | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  website: string | null;
  rookie_year: number | null;
  motto: string | null;
  home_championship: any | null;
}

export interface TBATeamSimple {
  key: string;
  team_number: number;
  nickname: string;
  name: string;
  city: string | null;
  state_prov: string | null;
  country: string | null;
}

export interface TBAEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  district: {
    abbreviation: string;
    display_name: string;
    key: string;
    year: number;
  } | null;
  city: string;
  state_prov: string;
  country: string;
  start_date: string;
  end_date: string;
  year: number;
}

export interface TBAMatch {
  key: string;
  comp_level: string;
  alliances: {
    blue: {
      team_keys: string[];
      score: number;
    };
    red: {
      team_keys: string[];
      score: number;
    };
  };
}

export interface TBAAward {
  name: string;
  award_type: number;
  event_key: string;
  recipient_list: {
    team_key: string;
    awardee: string | null;
  }[];
}

export interface TBAEventStatus {
  qual: {
    num_teams: number;
    ranking: {
      matches_played: number;
      qual_average: number;
      sort_orders: number[];
      record: {
        wins: number;
        losses: number;
        ties: number;
      };
      rank: number;
      dq: number;
      team_key: string;
    };
  } | null;
  alliance: {
    name: string;
    number: number;
    pick: number;
    backup: {
      out: string;
      in: string;
    } | null;
  } | null;
  playoff: {
    level: string;
    current_level_record: {
      wins: number;
      losses: number;
      ties: number;
    };
    record: {
      wins: number;
      losses: number;
      ties: number;
    };
    status: string;
  } | null;
  alliance_status_str: string;
  playoff_status_str: string;
  overall_status_str: string;
  next_match_key: string | null;
  last_match_key: string | null;
} 