import fs from "fs";
import path from "path";
import OpenAI from "openai";

// ----------------------------
// 1. OPENAI SETUP
// ----------------------------

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------
// 2. TODAY'S DATE
// ----------------------------

const today = new Date().toISOString().split("T")[0];

// ----------------------------
// 3. FILE PATHS
// ----------------------------

const basePromptPath = "prompts/base_prompt.txt";
const configPath = "prompts/config.json";
const storedPoemsPath = "prompts/stored_poems.json";
const fallbackPoemsPath = "prompts/fallback_poems.json";
const dailyStatusPath = path.join("analytics", "daily_status.json");

// ----------------------------
// 4. LOAD FILES
// ----------------------------

const basePrompt = fs.readFileSync(basePromptPath, "utf-8");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

let storedPoems = {};
if (fs.existsSync(storedPoemsPath)) {
  storedPoems = JSON.parse(fs.readFileSync(storedPoemsPath, "utf-8"));
}

// ----------------------------
// 5. IF TODAY ALREADY EXISTS
// ----------------------------

if (storedPoems[today]) {
  console.log("\nToday’s Poem\n");
  console.log(storedPoems[today].poem);

  console.log("\n--- RUN SUMMARY ---");
  console.log("Source: stored");
  console.log("Sanitation: n/a");
  console.log("Duplication retry: false");
  console.log("Fallback used: false");
  console.log("Failure reason: none");
  console.log("-------------------\n");

  process.exit();
}

// ----------------------------
// 6. HELPERS
// ----------------------------

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getFallbackPoem() {
  const fallbackData = JSON.parse(
    fs.readFileSync(fallbackPoemsPath, "utf-8")
  );
  return pickRandom(fallbackData).poem;
}

// ----------------------------
// 7. SANITATION LAYER
// ----------------------------

function sanitizePoem(rawPoem) {
  const forbiddenSingleWords = [
    "Menu",
    "Home",
    "Login",
    "Sign In",
    "Sign Out",
    "Register",
    "Search"
  ];

  let lines = rawPoem
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  lines = lines.filter(line => {
    return !forbiddenSingleWords.includes(line);
  });

  const lineCount = lines.length;

  if (lineCount < 6 || lineCount > 16) {
    console.log(
      `⚠️ Sanitation rejected poem — line count: ${lineCount} (allowed: 6–16)`
    );
    return null;
  }

  return lines.join("\n");
}

// ----------------------------
// 8. DUPLICATION GUARD
// ----------------------------

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

function calculateSimilarity(textA, textB) {
  const wordsA = new Set(normalizeText(textA));
  const wordsB = new Set(normalizeText(textB));

  let common = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) common++;
  });

  return common / Math.max(wordsA.size, 1);
}

function isTooSimilarToRecent(poem) {
  const recentDates = Object.keys(storedPoems)
    .sort()
    .reverse()
    .slice(0, 3);

  for (const date of recentDates) {
    const similarity = calculateSimilarity(
      poem,
      storedPoems[date].poem
    );

    if (similarity >= 0.7) {
      console.log(
        `⚠️ Similarity detected (${(similarity * 100).toFixed(1)}%) with ${date}`
      );
      return true;
    }
  }

  return false;
}

// ----------------------------
// 9. BUILD PROMPT
// ----------------------------

const focus = pickRandom(config.focus);
const tone = pickRandom(config.tone);

const finalPrompt = `
${basePrompt}

Today's subtle focus (do not mention explicitly): ${focus}
Primary emotional tone: ${tone}
`;

// ----------------------------
// 10. GENERATE POEM
// ----------------------------

async function generatePoem() {
  let failureReason = "none";
  let duplicationRetryUsed = false;
  let fallbackUsed = false;
  let sanitationPassed = true;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: finalPrompt }],
    });

    let rawPoem = response.choices[0].message.content.trim();
    let poem = sanitizePoem(rawPoem);

    if (!poem) {
      sanitationPassed = false;
      failureReason = "sanitation_rejected";
      throw new Error("SANITATION_FAILED");
    }

    if (isTooSimilarToRecent(poem)) {
      duplicationRetryUsed = true;
      console.log("🔁 Regenerating due to duplication risk...");

      const retryResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: finalPrompt }],
      });

      rawPoem = retryResponse.choices[0].message.content.trim();
      poem = sanitizePoem(rawPoem);

      if (!poem) {
        sanitationPassed = false;
        failureReason = "sanitation_rejected_after_retry";
        throw new Error("SANITATION_FAILED_AFTER_RETRY");
      }
    }

    storedPoems[today] = {
      poem,
      source: "openai",
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      storedPoemsPath,
      JSON.stringify(storedPoems, null, 2)
    );

    console.log("\nToday’s Poem\n");
    console.log(poem);

  } catch (error) {
    fallbackUsed = true;

    if (failureReason === "none") {
      failureReason = "api_failure";
    }

    const fallbackPoem = getFallbackPoem();

    storedPoems[today] = {
      poem: fallbackPoem,
      source: "fallback",
      createdAt: new Date().toISOString(),
      error: error.message,
    };

    fs.writeFileSync(
      storedPoemsPath,
      JSON.stringify(storedPoems, null, 2)
    );

    console.log("\nToday’s Poem\n");
    console.log(fallbackPoem);
  }

  updateDailyStatus(today, {
    scheduled_run_status: "success",
    generation_source: fallbackUsed ? "fallback" : "openai",
    fallback_used: fallbackUsed,
    failure_reason: failureReason,
    duplication_retry_used: duplicationRetryUsed
  });

  console.log("\n--- RUN SUMMARY ---");
  console.log(`Source: ${fallbackUsed ? "fallback" : "openai"}`);
  console.log(`Sanitation: ${sanitationPassed ? "passed" : "failed"}`);
  console.log(`Duplication retry: ${duplicationRetryUsed}`);
  console.log(`Fallback used: ${fallbackUsed}`);
  console.log(`Failure reason: ${failureReason}`);
  console.log("-------------------\n");
}

// ----------------------------
// 11. ANALYTICS UPDATE
// ----------------------------

function updateDailyStatus(dateKey, statusUpdate) {
  let data = {};

  try {
    if (fs.existsSync(dailyStatusPath)) {
      data = JSON.parse(fs.readFileSync(dailyStatusPath, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to read daily_status.json:", err);
  }

  data[dateKey] = {
    ...(data[dateKey] || {}),
    ...statusUpdate
  };

  try {
    fs.writeFileSync(dailyStatusPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write daily_status.json:", err);
  }
}

// ----------------------------
// 12. RUN
// ----------------------------

generatePoem();