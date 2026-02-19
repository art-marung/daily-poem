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
// 5. IF TODAY ALREADY EXISTS, SERVE IT
// ----------------------------

if (storedPoems[today]) {
  console.log("📖 Serving stored poem for today:\n");
  console.log(storedPoems[today].poem);
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

  // Remove isolated UI/navigation artifacts
  lines = lines.filter(line => {
    return !forbiddenSingleWords.includes(line);
  });

  // Enforce structural boundary (6–16 lines)
if (lines.length < 6 || lines.length > 16) {
    return null;
  }

  return lines.join("\n");
}

// ----------------------------
// 8. BUILD PROMPT
// ----------------------------

const focus = pickRandom(config.focus);
const tone = pickRandom(config.tone);

const finalPrompt = `
${basePrompt}

Today's subtle focus (do not mention explicitly): ${focus}
Primary emotional tone: ${tone}
`;

// ----------------------------
// 9. GENERATE POEM
// ----------------------------

async function generatePoem() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    });

    const rawPoem = response.choices[0].message.content.trim();
    const poem = sanitizePoem(rawPoem);

    if (!poem) {
      throw new Error("Sanitation failed: structural violation");
    }

    storedPoems[today] = {
      poem: poem,
      source: "openai",
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      storedPoemsPath,
      JSON.stringify(storedPoems, null, 2)
    );

    console.log("🌤️ Today’s poem (OpenAI):\n");
    console.log(poem);

    updateDailyStatus(today, {
      scheduled_run_status: "success",
      generation_source: "openai",
      fallback_used: false,
      error_flag: false
    });

  } catch (error) {
    console.log("⚠️ OpenAI failed or sanitation failed — using fallback poem.\n");

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

    console.log("🌿 Today’s poem (Fallback):\n");
    console.log(fallbackPoem);

    updateDailyStatus(today, {
      scheduled_run_status: "success",
      generation_source: "fallback",
      fallback_used: true,
      error_flag: false
    });
  }
}

// ----------------------------
// 10. ANALYTICS UPDATE
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
// 11. RUN
// ----------------------------

generatePoem();
