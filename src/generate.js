// We import tools that Node.js already gives us
// fs = file system (reading and writing files)
import fs from "fs";
import OpenAI from "openai";

// ----------------------------
// 1. SET UP OPENAI
// ----------------------------

// This creates a connection to OpenAI using your API key
// Your key lives safely in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ----------------------------
// 2. FIGURE OUT TODAY
// ----------------------------

// This turns the current date into a simple string like "2026-01-03"
// We use this as our "label" for today's poem
const today = new Date().toISOString().split("T")[0];

// ----------------------------
// 3. LOAD FILE PATHS
// ----------------------------

// Where the base prompt lives
const basePromptPath = "prompts/base_prompt.txt";

// Where the focus & tone options live
const configPath = "prompts/config.json";

// Where we store poems we already created
const storedPoemsPath = "prompts/stored_poems.json";

// ----------------------------
// 4. READ FILES FROM DISK
// ----------------------------

// Load the base prompt text
const basePrompt = fs.readFileSync(basePromptPath, "utf-8");

// Load the config (focus + tone)
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Load stored poems (or start empty if none exist)
let storedPoems = {};
if (fs.existsSync(storedPoemsPath)) {
  storedPoems = JSON.parse(fs.readFileSync(storedPoemsPath, "utf-8"));
}

// ----------------------------
// 5. IF TODAY'S POEM ALREADY EXISTS, USE IT
// ----------------------------

if (storedPoems[today]) {
  console.log("📖 Serving stored poem for today:\n");
  console.log(storedPoems[today].poem);
  process.exit(); // stop the program
}

// ----------------------------
// 6. PICK RANDOM FOCUS & TONE
// ----------------------------

// This helper function picks one random item from a list
function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const focus = pickRandom(config.focus);
const tone = pickRandom(config.tone);

// ----------------------------
// 7. BUILD FINAL PROMPT
// ----------------------------

// We combine:
// - the base prompt
// - today’s subtle focus
// - today’s emotional tone
const finalPrompt = `
${basePrompt}

Today's subtle focus (do not mention explicitly): ${focus}
Primary emotional tone: ${tone}
`;

// ----------------------------
// 8. ASK OPENAI TO WRITE THE POEM
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

    // Get the poem text from the response
    const poem = response.choices[0].message.content.trim();

    // ----------------------------
    // 9. SAVE POEM TO DISK
    // ----------------------------

    storedPoems[today] = {
      poem: poem,
      source: "openai",
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      storedPoemsPath,
      JSON.stringify(storedPoems, null, 2)
    );

    // ----------------------------
    // 10. PRINT POEM
    // ----------------------------

    console.log("🌤️ Today’s poem:\n");
    console.log(poem);

  } catch (error) {
    console.error("Something went wrong:", error.message);
  }
}

// ----------------------------
// 11. RUN THE FUNCTION
// ----------------------------

generatePoem();
