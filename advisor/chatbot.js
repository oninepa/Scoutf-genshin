// advisor/chatbot.js
// Pointip-Free — Genie (지니) 대화형 AI

const readline = require("readline");
const decrypt = require("./decrypt");
const localBrain = decrypt.loadLocalBrain();
const { chat, chatStream, loadConfig } = require("./llm-wrapper");
const { buildContext } = require("./context");
const missions = require("./missions");
const { getLLMAddOn } = require("./chat-api");

const UID = "784667533";
const SKIP_LLM_TYPES = ["greeting", "thanks", "meta"];

const SYSTEM_PROMPT = `너의 이름은 "지니(Genie)"다. 게임을 하는 사용자를 돕는 AI 안내자.

## 정체성
- 특정 게임에 종속되지 않는 중립적 AI 파트너
- 게임 고유명사, NPC 화법 사용 금지

## 말투
- 따뜻하고 친근하게. 살짝 놀리는 유머도 좋다.
- 사용자를 "여행자님" 이라고 부른다.

## 답변 형식
1. 마크다운 금지: 별표(*), 우물정(#), 백틱(\`), 하이픈(-) 목록 금지.
2. 이모지 금지.
3. 퍼센트 → "퍼센트", 슬래시 → "또는", 화살표 → "에서".
4. 스탯은 한국어로: HP→체력, ATK→공격력, crit rate→치명타 확률.
5. 숫자는 그대로. 1000 이상은 한글로.
6. 한국어만.

## 사실 규칙
1. 팩트만 사실로 사용. 추측 금지.
2. 팩트에 없는 캐릭터 이름 지어내지 않는다.

## 오타 처리
- "쌘", "쎈" = "센" (강한)

## 길이
- 기본 2~4문장. 짧게.`;

function cleanForTTS(text) {
  if (!text) return "";
  let t = text;
  t = t.replace(/\*\*(.+?)\*\*/g, "$1");
  t = t.replace(/\*(.+?)\*/g, "$1");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/^#+\s*/gm, "");
  t = t.replace(/^\s*[-*]\s+/gm, "그리고 ");
  t = t.replace(/_/g, " 와 ");
  t = t.replace(/%/g, "퍼센트");
  t = t.replace(/\//g, " 또는 ");
  t = t.replace(/→/g, " 에서 ");
  t = t.replace(/~/g, "");
  t = t.replace(
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu,
    "",
  );
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

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
  const config = loadConfig();

  console.log("");
  console.log("========================================");
  console.log("  Scoutf-Geshin  |  AI 파트너 지니");
  console.log("========================================");
  console.log("");

  const active = [];
  if (config.groq?.apiKey) active.push("Groq");
  if (config.openrouter?.apiKey) active.push("OpenRouter");
  console.log(`모드: 자동 (${active.join(" → ")})`);
  console.log("");

  console.log("계정 데이터 로드 중...");
  const context = buildContext(UID);
  console.log(`로드 완료 (${context.length}자)`);
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

  const history = [];

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

      const local = localBrain.tryLocal(UID, input);
      if (local) {
        process.stdout.write(`\n지니: ${local.answer}\n`);

        const skipLLM = SKIP_LLM_TYPES.includes(local.type);

        const llmPromise = skipLLM
          ? Promise.resolve()
          : getLLMAddOn(local.answer, input, context, SYSTEM_PROMPT)
              .then((r) => {
                if (!r) console.warn("   ⚠️ LLM 부연 실패 (반환값 없음)");
              })
              .catch((e) => {
                console.warn("   ⚠️ LLM 부연 에러:", e.message);
              });

        await llmPromise;
        process.stdout.write("\n");

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`   [${elapsed}초]\n`);

        history.push({ role: "user", content: input });
        history.push({ role: "assistant", content: local.answer });
        if (history.length > 10) history.splice(0, 2);

        return ask();
      }

      process.stdout.write("\n지니: ");

      let firstChunkAt = 0;
      const onChunk = (chunk) => {
        if (!firstChunkAt) firstChunkAt = Date.now();
        process.stdout.write(chunk);
      };

      try {
        let reply = "";
        try {
          reply = await chatStream(
            [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `[팩트]\n${context}` },
              { role: "assistant", content: "네, 확인했습니다." },
              ...history,
              { role: "user", content: input },
            ],
            onChunk,
          );
        } catch (streamErr) {
          process.stdout.write("(일반 모드) ");
          reply = await chat([
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `[팩트]\n${context}` },
            { role: "assistant", content: "네, 확인했습니다." },
            ...history,
            { role: "user", content: input },
          ]);
          process.stdout.write(reply);
        }

        const cleanReply = cleanForTTS(reply);

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const firstToken = firstChunkAt
          ? ((firstChunkAt - start) / 1000).toFixed(1)
          : elapsed;

        console.log(`\n   [첫 응답 ${firstToken}초 / 전체 ${elapsed}초]\n`);

        history.push({ role: "user", content: input });
        history.push({ role: "assistant", content: cleanReply });
        if (history.length > 10) history.splice(0, 2);
      } catch (e) {
        console.log("");
        console.error("에러:", e.message);
        console.log("");
      }

      ask();
    });
  };

  ask();
}

main().catch((e) => {
  console.error("시작 에러:", e.message);
  process.exit(1);
});
