import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval(
  "expire device sign-in requests",
  { minutes: 1 },
  internal.deviceLoginInternals.cleanup,
);
export default crons;
