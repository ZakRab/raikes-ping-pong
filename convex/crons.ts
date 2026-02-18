import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily reminder at 8 AM Central (14:00 UTC)
crons.cron(
  "daily match reminders",
  "0 14 * * *",
  internal.matchReminders.sendDayOfReminders
);

export default crons;
