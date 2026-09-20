// advisor/local-brain/facts.js
// context 데이터를 계산된 팩트로 변환

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data-pipeline", "output");
const SPIKE_DIR = path.join(__dirname, "..", "..", "spike", "output");

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function buildFacts(uid) {
  const hoyo = loadJson(path.join(DATA_DIR, `hoyolab_${uid}.json`));
  const roster = loadJson(path.join(DATA_DIR, `roster_${uid}.json`));
  const results = loadJson(path.join(SPIKE_DIR, "results.json"));

  const n = hoyo?.notes || {};
  const abyss = hoyo?.abyss || {};

  // 레진 계산
  const resin = n.resin ?? 0;
  const resinMax = n.max_resin ?? 200;
  const hoursToFull =
    resin >= resinMax ? 0 : ((resinMax - resin) / 5).toFixed(1);

  // 일일
  const dailyDone = n.commissions_done ?? 0;
  const dailyMax = n.commissions_max ?? 4;

  // 파견
  const expeditions = (n.expeditions || []).length;
  const expeditionsMax = n.max_expeditions ?? 5;

  // 선계
  const realmCur = n.realm_currency ?? 0;
  const realmMax = n.max_realm_currency ?? 2400;

  // 나선
  const stars = abyss.total_stars ?? 0;

  // TOP 파티
  const top3 = (results || []).slice(0, 3).map((r) => ({
    team: (r.party || "").replace(/_/g, " + "),
    damage: r.dps,
  }));

  return {
    resin: {
      current: resin,
      max: resinMax,
      isFull: resin >= resinMax,
      hoursToFull,
    },
    daily: {
      done: dailyDone,
      max: dailyMax,
      isComplete: dailyDone >= dailyMax,
    },
    expeditions: {
      current: expeditions,
      max: expeditionsMax,
      isFull: expeditions >= expeditionsMax,
    },
    realm: { current: realmCur, max: realmMax },
    abyss: { stars, starsLeft: 36 - stars },
    roster: roster || [],
    top3,
  };
}

module.exports = { buildFacts };
