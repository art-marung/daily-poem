import fs from "fs";
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
// 7. BUILD PROMPT
// ----------------------------

const focus = pickRandom(config.focus);
const tone = pickRandom(config.tone);

const finalPrompt = `
${basePrompt}

Today's subtle focus (do not mention explicitly): ${focus}
Primary emotional tone: ${tone}
`;

// ----------------------------
// 8. GENERATE POEM
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

    const poem = response.choices[0].message.content.trim();

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

  } catch (error) {
    console.log("⚠️ OpenAI failed — using fallback poem.\n");

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
  }
}

// ----------------------------
// 9. RUN
// ----------------------------

generatePoem();
