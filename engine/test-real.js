// engine/test-real.js
// 실제 facts 데이터로 엔진 테스트

const path = require("path");
const fs = require("fs");

const engine = require("./template-engine");

// ─── 실제 hoyolab 데이터 로드 ───
const dataPath = path.join(
  __dirname,
  "..",
  "data-pipeline",
  "output",
  "hoyolab_784667533.json",
);
const hoyo = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// ─── facts (facts.js의 buildFacts 결과 흉내) ───
const n = hoyo.notes || {};
const resin = n.resin ?? 0;
const resinMax = n.max_resin ?? 200;
const facts = {
  resin: {
    current: resin,
    max: resinMax,
    isFull: resin >= resinMax,
    hoursToFull: resin >= resinMax ? 0 : ((resinMax - resin) / 5).toFixed(1),
    discountsLeft: n.resin_discounts_left ?? 0,
  },
  daily: {
    done: n.commissions_done ?? 0,
    max: n.commissions_max ?? 4,
    left: (n.commissions_max ?? 4) - (n.commissions_done ?? 0),
    isComplete: (n.commissions_done ?? 0) >= (n.commissions_max ?? 4),
  },
  expeditions: {
    current: (n.expeditions || []).length,
    max: n.max_expeditions ?? 5,
  },
  realm: { current: n.realm_currency ?? 0, max: n.max_realm_currency ?? 2400 },
  abyss: {
    stars: hoyo.abyss?.total_stars ?? 0,
    starsLeft: 36 - (hoyo.abyss?.total_stars ?? 0),
  },
};

// ─── analyzer로 context 만들기 ───
const analyzer = require(
  path.join(
    __dirname,
    "..",
    "advisor",
    "assets",
    "games",
    "genshin",
    "analyzer.js",
  ),
);

// roster에 keyKo 추가 (한글 이름)
const decrypt = require(path.join(__dirname, "..", "advisor", "decrypt.js"));
const { charKR } = decrypt.getNamesKo();

const roster = (hoyo.roster || []).map((c) => ({
  ...c,
  keyKo: charKR(c.key),
}));

const context = analyzer.analyze(facts, roster, {
  teapot: hoyo.teapot,
  explorations: hoyo.explorations,
  stats: hoyo.stats,
});

// ─── 템플릿 로드 ───
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

// ─── 테스트 ───
const tests = [
  "레진 어디 쓸까?",
  "레진 남았어?",
  "오늘 일일 뭐 남았어?",
  "내 캐릭터 뭐 있어?",
  "가장 센 캐릭터는?",
  "성유물 파밍해야 해?",
];

console.log("=== 실제 데이터 테스트 ===\n");
for (const input of tests) {
  const result = engine.pickTemplate(data.templates, input, context);
  console.log(`Q: ${input}`);
  if (result) {
    console.log(`  [${result.id}]`);
    console.log(`  A: ${result.text}\n`);
  } else {
    console.log(`  (매칭 없음)\n`);
  }
}
