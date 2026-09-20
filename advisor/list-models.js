// advisor/list-models.js
const { printGeminiModels, loadConfig } = require("./llm-wrapper");

async function main() {
  const config = loadConfig();
  const apiKey = config.api?.apiKey;
  if (!apiKey) {
    console.error("❌ config.json의 api.apiKey가 비어있습니다.");
    process.exit(1);
  }
  await printGeminiModels(apiKey);
}

main().catch((e) => {
  console.error("❌ 에러:", e.message);
  process.exit(1);
});
