import fs from "fs";

// Load prompt and config
const basePrompt = fs.readFileSync("prompts/base_prompt.txt", "utf-8");
const config = JSON.parse(fs.readFileSync("prompts/config.json", "utf-8"));

// Pick a random item from an array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const focus = pickRandom(config.focus);
const tone = pickRandom(config.tone);

// Combine into final prompt
const finalPrompt = `
${basePrompt}

Today's subtle focus (do not mention explicitly): ${focus}
Primary emotional tone: ${tone}
`;

console.log("=== FINAL PROMPT SENT TO MODEL ===\n");
console.log(finalPrompt);
