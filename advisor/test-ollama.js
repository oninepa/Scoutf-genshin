// advisor/test-ollama.js
const ollama = require("ollama").default;

async function main() {
  console.log("🤖 Ollama 호출 중...\n");
  const start = Date.now();

  const res = await ollama.chat({
    model: "qwen2.5-3b-64k:latest",
    messages: [
      {
        role: "system",
        content: "너는 원신 도우미다. 한국어로 짧고 친근하게 답한다.",
      },
      {
        role: "user",
        content: "다이루크가 뭐야? 한 문장으로 알려줘.",
      },
    ],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`⏱️  ${elapsed}초\n`);
  console.log("=== 답변 ===");
  console.log(res.message.content);
}

main().catch((e) => {
  console.error("❌ 에러:", e.message);
  process.exit(1);
});