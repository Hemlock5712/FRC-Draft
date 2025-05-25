import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Sync teams every Sunday at 2 AM UTC
crons.weekly(
  "weekly team sync",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.teams.syncTeamsFromTBA
);

export default crons; 