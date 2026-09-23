// advisor/chatbot.js
// Pointip-Free — CLI 테스트 도구
// 서버(chat-api.js)와 동일한 로직 사용

const readline = require("readline");
const api = require("./chat-api");
const missions = require("./missions");

const UID = "784667533";

function handleMissionCommand(input) {
  const cmd = input.trim().toLowerCase();
  if (cmd === "/mission" || cmd === "미션" || cmd === "미션 추천") {
    const picks = missions.randomMissions(3);
    console.log("\n🎯 지니의 추천 미션 3가지\n");
    picks.forEach((m, i) =>
      console.log(`  ${i + 1}. [${m.categoryName}] ${m.mission}`),
    );
    console.log("");
    return { handled: true };
  }
  if (cmd === "/mission list" || cmd === "미션 목록") {
    const cats = missions.listCategories();
    console.log(`\n📋 미션 카테고리 ${cats.length}개\n`);
    cats.forEach((c) =>
      console.log(`  ${c.key.padEnd(14)} ${c.name} (${c.count}개)`),
    );
    console.log("");
    return { handled: true };
  }
  if (cmd.startsWith("/mission ")) {
    const catKey = cmd.split(/\s+/)[1];
    const pick = missions.randomMission(catKey);
    if (!pick) {
      console.log(`❌ 카테고리 없음: ${catKey}\n`);
      return { handled: true };
    }
    console.log(`\n🎯 [${pick.categoryName}] ${pick.mission}\n`);
    return { handled: true };
  }
  return { handled: false };
}

async function main() {
  console.log("");
  console.log("========================================");
  console.log("  ScoutF-Genshin  |  AI 파트너 지니");
  console.log("========================================");
  console.log("");
  console.log("(템플릿 엔진 모드 — LLM 미사용)");
  console.log("");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("지니: 안녕하세요, 여행자님. 저는 지니입니다.");
  console.log("");
  console.log("      명령어:");
  console.log("        /mission          랜덤 미션 3개");
  console.log("        /mission list     카테고리 목록");
  console.log("      (종료: Ctrl+C)");
  console.log("");

  process.on("SIGINT", () => {
    console.log("\n\n지니: 안녕히 가세요, 여행자님.");
    process.exit(0);
  });

  const ask = () => {
    rl.question("여행자: ", async (input) => {
      if (!input.trim()) return ask();

      const missionCmd = handleMissionCommand(input);
      if (missionCmd.handled) return ask();

      const start = Date.now();

      // 1단계: 로컬 브레인
      const localResult = await api.chatLocal(input);

      if (localResult.local) {
        process.stdout.write(`\n지니: ${localResult.local}\n`);
      }

      // 2단계: 템플릿 엔진 (LLM 대체)
      if (!localResult.skipLLM) {
        const llmResult = await api.chatLLM(input, localResult.local);
        if (llmResult.llm) {
          process.stdout.write(`\n지니: ${llmResult.llm}\n`);
        }
      }

      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`\n   [${elapsed}초]\n`);

      ask();
    });
  };

  ask();
}

main().catch((e) => {
  console.error("시작 에러:", e.message);
  process.exit(1);
});
