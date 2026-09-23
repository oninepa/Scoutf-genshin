// engine/test-engine.js
// 엔진 동작 테스트

const path = require("path");
const engine = require("./template-engine");

// 템플릿 로드
const templatesPath = path.join(
  __dirname,
  "..",
  "advisor",
  "assets",
  "games",
  "genshin",
  "templates.json",
);

const data = engine.loadTemplates(templatesPath);
console.log(`✅ 템플릿 로드: ${data.templates.length}개\n`);

// 테스트 facts (가짜 데이터)
const facts = {
  resin: {
    current: 200,
    max: 200,
    isFull: true,
    discountsLeft: 3,
  },
  daily: {
    done: 0,
    max: 4,
    left: 4,
    isComplete: false,
  },
  roster: {
    count: 33,
    fiveStars: "플린스, 다이루크, 여행자, 야란, 치치, 종려",
  },
  weakestCharacter: "플린스",
  weakestStats: {
    critRate: 3.5,
  },
  strongest: {
    name: "다이루크",
    reason: "치확 65%, 치피 140%로 균형이 좋습니다.",
  },
};

// 테스트 케이스
const tests = [
  "레진 어디 쓸까?",
  "레진 남았어?",
  "오늘 일일 뭐 남았어?",
  "내 캐릭터 뭐 있어?",
  "가장 센 캐릭터는?",
  "성유물 파밍해야 해?",
];

console.log("=== 테스트 결과 ===\n");
for (const input of tests) {
  const result = engine.pickTemplate(data.templates, input, facts);
  console.log(`Q: ${input}`);
  if (result) {
    console.log(`  [${result.id}] (priority ${result.priority})`);
    console.log(`  A: ${result.text}\n`);
  } else {
    console.log(`  (매칭 없음)\n`);
  }
}
