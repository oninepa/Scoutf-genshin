// advisor/missions.js
// Pointip-Free — 미션 아이디어 뱅크
// missions.json 로드 + 랜덤 선택

const fs = require("fs");
const path = require("path");

const MISSIONS_PATH = path.join(__dirname, "missions.json");

let cached = null;

function loadMissions() {
  if (cached) return cached;
  try {
    const raw = fs.readFileSync(MISSIONS_PATH, "utf-8");
    cached = JSON.parse(raw);
    return cached;
  } catch (e) {
    console.warn("missions.json 로드 실패:", e.message);
    return { categories: {} };
  }
}

// 카테고리 목록
function listCategories() {
  const data = loadMissions();
  return Object.entries(data.categories || {}).map(([key, c]) => ({
    key,
    name: c.name,
    desc: c.desc,
    count: (c.missions || []).length,
  }));
}

// 랜덤 미션 1개
function randomMission(categoryKey = null) {
  const data = loadMissions();
  const cats = data.categories || {};
  const keys = Object.keys(cats);
  if (keys.length === 0) return null;

  let catKey = categoryKey;
  if (!catKey || !cats[catKey]) {
    catKey = keys[Math.floor(Math.random() * keys.length)];
  }
  const cat = cats[catKey];
  const list = cat.missions || [];
  if (list.length === 0) return null;

  const mission = list[Math.floor(Math.random() * list.length)];
  return {
    category: catKey,
    categoryName: cat.name,
    mission,
  };
}

// 랜덤 미션 N개 (중복 없이)
function randomMissions(n = 3) {
  const data = loadMissions();
  const cats = data.categories || {};
  const all = [];
  for (const [key, c] of Object.entries(cats)) {
    for (const m of c.missions || []) {
      all.push({ category: key, categoryName: c.name, mission: m });
    }
  }
  if (all.length === 0) return [];

  const shuffled = all.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// 카테고리 1개에서 랜덤 미션 1개 (중복 카테고리 회피용)
function randomMissionFromCategory(categoryKey) {
  return randomMission(categoryKey);
}

// LLM 부연용: 매번 다른 카테고리에서 하나 뽑기
// 최근 뽑힌 카테고리는 피해서 다양성 확보
const recentCategories = [];
const MAX_RECENT = 5;

function pickForLLM() {
  const data = loadMissions();
  const cats = data.categories || {};
  const keys = Object.keys(cats).filter((k) => !recentCategories.includes(k));
  if (keys.length === 0) {
    recentCategories.length = 0;
    return pickForLLM();
  }

  const catKey = keys[Math.floor(Math.random() * keys.length)];
  const cat = cats[catKey];
  const list = cat.missions || [];
  if (list.length === 0) return null;

  const mission = list[Math.floor(Math.random() * list.length)];

  recentCategories.push(catKey);
  if (recentCategories.length > MAX_RECENT) recentCategories.shift();

  return {
    category: catKey,
    categoryName: cat.name,
    mission,
  };
}

// 텍스트 포맷 (시스템 프롬프트 주입용)
function formatMissionsForPrompt(missions) {
  if (!missions || missions.length === 0) return "";
  return missions
    .map((m, i) => `${i + 1}번 미션 (${m.categoryName}): ${m.mission}`)
    .join("\n");
}

module.exports = {
  loadMissions,
  listCategories,
  randomMission,
  randomMissions,
  randomMissionFromCategory,
  pickForLLM,
  formatMissionsForPrompt,
};
