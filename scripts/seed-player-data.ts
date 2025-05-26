/**
 * Seed script for 2023 and 2024 FRC player data
 * This script populates the database with realistic team and event data
 * for testing the fantasy FRC system
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Sample team data based on real FRC teams
const SAMPLE_TEAMS = [
  // Top performing teams from 2023-2024
  { teamNumber: 254, name: "The Cheesy Poofs", city: "San Jose", stateProv: "CA", country: "USA", rookieYear: 1999 },
  { teamNumber: 1678, name: "Citrus Circuits", city: "Davis", stateProv: "CA", country: "USA", rookieYear: 2005 },
  { teamNumber: 148, name: "Robowranglers", city: "Greenville", stateProv: "TX", country: "USA", rookieYear: 1992 },
  { teamNumber: 971, name: "Spartan Robotics", city: "Mountain View", stateProv: "CA", country: "USA", rookieYear: 2002 },
  { teamNumber: 2056, name: "OP Robotics", city: "Overland Park", stateProv: "KS", country: "USA", rookieYear: 2007 },
  { teamNumber: 1323, name: "MadTown Robotics", city: "Madison", stateProv: "WI", country: "USA", rookieYear: 2004 },
  { teamNumber: 3476, name: "Code Orange", city: "Ladera Ranch", stateProv: "CA", country: "USA", rookieYear: 2010 },
  { teamNumber: 2910, name: "Jack in the Bot", city: "San Diego", stateProv: "CA", country: "USA", rookieYear: 2009 },
  { teamNumber: 1114, name: "Simbotics", city: "St. Catharines", stateProv: "ON", country: "Canada", rookieYear: 2003 },
  { teamNumber: 6328, name: "Mechanical Advantage", city: "Littleton", stateProv: "MA", country: "USA", rookieYear: 2016 },
  
  // Additional competitive teams
  { teamNumber: 118, name: "The Robonauts", city: "Houston", stateProv: "TX", country: "USA", rookieYear: 1992 },
  { teamNumber: 1619, name: "Up-A-Creek Robotics", city: "Fenton", stateProv: "MI", country: "USA", rookieYear: 2005 },
  { teamNumber: 2767, name: "Stryke Force", city: "Kalamazoo", stateProv: "MI", country: "USA", rookieYear: 2008 },
  { teamNumber: 3310, name: "Blackhawks", city: "Loves Park", stateProv: "IL", country: "USA", rookieYear: 2010 },
  { teamNumber: 4414, name: "HighTide", city: "Redondo Beach", stateProv: "CA", country: "USA", rookieYear: 2012 },
  { teamNumber: 5940, name: "BREAD", city: "Bakersfield", stateProv: "CA", country: "USA", rookieYear: 2015 },
  { teamNumber: 6036, name: "Peninsula Robotics", city: "Rancho Palos Verdes", stateProv: "CA", country: "USA", rookieYear: 2016 },
  { teamNumber: 7407, name: "Wired Boars", city: "Visalia", stateProv: "CA", country: "USA", rookieYear: 2019 },
  { teamNumber: 8033, name: "HighlanderBots", city: "Riverside", stateProv: "CA", country: "USA", rookieYear: 2020 },
  { teamNumber: 9072, name: "Goon Squad", city: "Bakersfield", stateProv: "CA", country: "USA", rookieYear: 2022 },
];

// Sample events for 2023 and 2024
const SAMPLE_EVENTS_2024 = [
  {
    eventKey: "2024casd",
    name: "San Diego Regional",
    eventCode: "casd",
    eventType: 1,
    city: "San Diego",
    stateProv: "CA",
    country: "USA",
    startDate: "2024-03-07",
    endDate: "2024-03-10",
    year: 2024,
    week: 2,
  },
  {
    eventKey: "2024casj",
    name: "Silicon Valley Regional",
    eventCode: "casj",
    eventType: 1,
    city: "San Jose",
    stateProv: "CA",
    country: "USA",
    startDate: "2024-03-14",
    endDate: "2024-03-17",
    year: 2024,
    week: 3,
  },
  {
    eventKey: "2024txho",
    name: "Houston Championship",
    eventCode: "txho",
    eventType: 3,
    city: "Houston",
    stateProv: "TX",
    country: "USA",
    startDate: "2024-04-17",
    endDate: "2024-04-20",
    year: 2024,
    week: 7,
  },
];

const SAMPLE_EVENTS_2023 = [
  {
    eventKey: "2023casd",
    name: "San Diego Regional",
    eventCode: "casd",
    eventType: 1,
    city: "San Diego",
    stateProv: "CA",
    country: "USA",
    startDate: "2023-03-09",
    endDate: "2023-03-12",
    year: 2023,
    week: 2,
  },
  {
    eventKey: "2023casj",
    name: "Silicon Valley Regional",
    eventCode: "casj",
    eventType: 1,
    city: "San Jose",
    stateProv: "CA",
    country: "USA",
    startDate: "2023-03-16",
    endDate: "2023-03-19",
    year: 2023,
    week: 3,
  },
  {
    eventKey: "2023txho",
    name: "Houston Championship",
    eventCode: "txho",
    eventType: 3,
    city: "Houston",
    stateProv: "TX",
    country: "USA",
    startDate: "2023-04-19",
    endDate: "2023-04-22",
    year: 2023,
    week: 7,
  },
];

// Generate realistic performance data
function generatePerformanceData(teamNumber: number, eventKey: string, year: number, week: number) {
  // Base performance on team reputation (lower numbers = better teams historically)
  const teamStrength = teamNumber <= 1000 ? 0.8 : teamNumber <= 3000 ? 0.6 : teamNumber <= 6000 ? 0.4 : 0.3;
  const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 to 1.2 multiplier
  const performance = teamStrength * randomFactor;
  
  // Generate qualification record (10-12 matches typical)
  const totalQualMatches = 10 + Math.floor(Math.random() * 3);
  const winRate = Math.min(0.9, Math.max(0.1, performance));
  const qualWins = Math.floor(totalQualMatches * winRate);
  const qualLosses = totalQualMatches - qualWins;
  const qualTies = 0; // Rare in modern FRC
  
  // Playoff performance (top 8 teams make playoffs)
  const madePlayoffs = performance > 0.5 && Math.random() > 0.3;
  let playoffWins = 0;
  let playoffLosses = 0;
  
  if (madePlayoffs) {
    // Simulate playoff bracket
    const playoffPerformance = performance * (Math.random() * 0.4 + 0.8);
    if (playoffPerformance > 0.8) {
      playoffWins = 4; // Won event
      playoffLosses = 0;
    } else if (playoffPerformance > 0.7) {
      playoffWins = 3; // Lost in finals
      playoffLosses = 1;
    } else if (playoffPerformance > 0.6) {
      playoffWins = 2; // Lost in semifinals
      playoffLosses = 1;
    } else {
      playoffWins = 1; // Lost in quarterfinals
      playoffLosses = 1;
    }
  }
  
  // Ranking (1-60 typical for regionals)
  const maxRank = eventKey.includes("txho") ? 120 : 60; // Championship has more teams
  const rank = Math.floor((1 - performance) * maxRank) + 1;
  const rankingScore = Math.floor(performance * 100 + Math.random() * 20);
  
  return {
    teamId: `frc${teamNumber}`,
    eventKey,
    year,
    week,
    qualWins,
    qualLosses,
    qualTies,
    totalQualMatches,
    playoffWins,
    playoffLosses,
    madePlayoffs,
    rank,
    rankingScore,
  };
}

async function seedTeams() {
  console.log("Seeding teams...");
  
  for (const team of SAMPLE_TEAMS) {
    try {
                    await client.mutation(api.teams.importTeams, {
         teams: [{
           teamId: `frc${team.teamNumber}`,
           teamNumber: team.teamNumber,
           name: team.name,
           city: team.city,
           stateProv: team.stateProv,
           country: team.country,
           rookieYear: team.rookieYear,
         }],
       });
      console.log(`✅ Added team ${team.teamNumber} - ${team.name}`);
    } catch (error) {
      console.error(`❌ Failed to add team ${team.teamNumber}:`, error);
    }
  }
}

async function seedEvents() {
  console.log("Seeding events...");
  
  const allEvents = [...SAMPLE_EVENTS_2023, ...SAMPLE_EVENTS_2024];
  
  for (const event of allEvents) {
    try {
      await client.mutation(api.playerManagement.upsertEvent, event);
      console.log(`✅ Added event ${event.eventKey} - ${event.name}`);
    } catch (error) {
      console.error(`❌ Failed to add event ${event.eventKey}:`, error);
    }
  }
}

async function seedPerformanceData() {
  console.log("Seeding performance data...");
  
  const allEvents = [...SAMPLE_EVENTS_2023, ...SAMPLE_EVENTS_2024];
  
  for (const event of allEvents) {
    console.log(`Generating performance data for ${event.eventKey}...`);
    
    // Not all teams attend every event
    const attendingTeams = SAMPLE_TEAMS.filter(() => Math.random() > 0.4); // ~60% attendance rate
    
    for (const team of attendingTeams) {
      try {
        const performanceData = generatePerformanceData(
          team.teamNumber,
          event.eventKey,
          event.year,
          event.week!
        );
        
        await client.mutation(api.playerManagement.recordTeamEventPerformance, performanceData);
        console.log(`  ✅ Added performance for team ${team.teamNumber} at ${event.eventKey}`);
      } catch (error) {
        console.error(`  ❌ Failed to add performance for team ${team.teamNumber}:`, error);
      }
    }
  }
}

async function calculateWeeklyScores() {
  console.log("Calculating weekly scores...");
  
  const years = [2023, 2024];
  const weeks = [2, 3, 7]; // Weeks with events
  
  for (const year of years) {
    for (const week of weeks) {
      try {
        await client.mutation(api.playerManagement.calculateWeeklyScores, {
          year,
          week,
        });
        console.log(`✅ Calculated weekly scores for ${year} Week ${week}`);
      } catch (error) {
        console.error(`❌ Failed to calculate weekly scores for ${year} Week ${week}:`, error);
      }
    }
  }
}

async function main() {
  console.log("🚀 Starting FRC player data seeding...");
  console.log("This will populate the database with 2023 and 2024 team and event data");
  
  try {
    await seedTeams();
    await seedEvents();
    await seedPerformanceData();
    await calculateWeeklyScores();
    
    console.log("\n🎉 Data seeding completed successfully!");
    console.log("\nSeeded data includes:");
    console.log(`- ${SAMPLE_TEAMS.length} teams`);
    console.log(`- ${SAMPLE_EVENTS_2023.length + SAMPLE_EVENTS_2024.length} events`);
    console.log("- Performance data for all team-event combinations");
    console.log("- Weekly scoring calculations");
    console.log("\nYou can now:");
    console.log("1. Create draft rooms and draft these teams");
    console.log("2. Test the Phase 5 league management features");
    console.log("3. Use the Phase 6 advanced features");
    console.log("4. View analytics and standings");
    
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

// Run the seeding script
if (require.main === module) {
  main().catch(console.error);
}

export { main as seedPlayerData }; 