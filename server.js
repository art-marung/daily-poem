import express from "express";
import fs from "fs";

const app = express();
const PORT = 3000;

const storedPoemsPath = "prompts/stored_poems.json";

// Helper to get today's date key
function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

app.get("/poem/today", (req, res) => {
  if (!fs.existsSync(storedPoemsPath)) {
    return res.status(404).json({
      error: "No poems stored yet."
    });
  }

  const storedPoems = JSON.parse(
    fs.readFileSync(storedPoemsPath, "utf-8")
  );

  const today = getTodayKey();

  if (!storedPoems[today]) {
    return res.status(404).json({
      error: "Today's poem not generated yet."
    });
  }

  res.json({
    date: today,
    poem: storedPoems[today].poem,
    source: storedPoems[today].source
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`📖 Daily Poem API running at http://localhost:${PORT}`);
});
