import cron from "node-cron";
import { spawn } from "child_process";

console.log("🕰️ Daily Poem Scheduler started");

// Run every day at 12:00 AM (server local time)
cron.schedule("0 0 * * *", () => {
  console.log("🌅 Running daily poem generation...");

  const process = spawn("node", ["src/generate.js"], {
    stdio: "inherit",
  });

  process.on("close", (code) => {
    console.log(`✅ Daily poem process finished with code ${code}`);
  });
});
