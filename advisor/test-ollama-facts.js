// advisor/test-ollama-facts.js
const ollama = require("ollama").default;

async function main() {
  const start = Date.now();

  // 🎯 우리가 아는 팩트를 먼저 준다
  const facts = `
[다이루크 정보 - 우리 DB]
- 이름: 다이루크 (Diluc)
- 원소: 불 (Pyro)
- 무기: 대검 (Claymore)
- 등급: ★5
- 역할: 메인딜러 / 서브딜러
- 유저 계정 상태: Lv.70, 별자리 0, 특성 5/6/5
- 현재 장착 무기: 이무기 검 Lv.70
- 시뮬 DPS: 3252 (약타 상대)
`;

  const res = await ollama.chat({
    model: "qwen2.5-3b-64k:latest",
    messages: [
      {
        role: "system",
        content:
          "너는 원신 도우미다. 아래 제공된 팩트만 사용해서 답한다. 팩트에 없는 내용은 추측하지 않는다. 한국어로 짧고 친근하게 답한다.",
      },
      {
        role: "user",
        content: `[제공된 팩트]\n${facts}\n\n[질문]\n내 다이루크 어때?`,
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
