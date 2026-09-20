// advisor/profile.js
// Pointip-Free — 계정별 프로필

const accounts = require("./accounts");

// ============================================================
// 기본 프로필
// ============================================================
function getDefault() {
  return {
    user: {
      level: "intermediate",
      playMode: ["solo"],
      styles: [],
      spending: "none",
    },
    ai: {
      answerStyle: "normal",
    },
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================
// 불러오기 (계정별)
// ============================================================
function load(accountIndex = 1) {
  const saved = accounts.loadProfile(accountIndex);
  if (!saved) return getDefault();
  return deepMerge(getDefault(), saved);
}

// ============================================================
// 저장 (계정별)
// ============================================================
function save(accountIndex = 1, data) {
  const current = load(accountIndex);
  const merged = deepMerge(current, data);
  merged.updatedAt = new Date().toISOString();
  accounts.saveProfile(accountIndex, merged);
  return merged;
}

// ============================================================
// 깊은 병합
// ============================================================
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source || {})) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      out[key] = deepMerge(tv, sv);
    } else {
      out[key] = sv;
    }
  }
  return out;
}

// ============================================================
// 유효값
// ============================================================
const VALID = {
  level: ["beginner", "intermediate", "advanced"],
  playMode: ["solo", "multi"],
  styles: [
    "story",
    "collection",
    "resource",
    "abyss",
    "theater",
    "leyline",
    "realm",
    "seaborn",
  ],
  spending: ["none", "light", "medium", "heavy"],
  answerStyle: ["detail", "normal", "simple"],
};

function validate(profile) {
  const errors = [];
  const u = profile.user || {};
  const a = profile.ai || {};

  if (u.level && !VALID.level.includes(u.level))
    errors.push(`level: ${u.level}`);
  if (u.playMode) {
    if (!Array.isArray(u.playMode)) errors.push("playMode: 배열 아님");
    else
      for (const m of u.playMode)
        if (!VALID.playMode.includes(m)) errors.push(`playMode: ${m}`);
  }
  if (u.styles) {
    if (!Array.isArray(u.styles)) errors.push("styles: 배열 아님");
    else
      for (const s of u.styles)
        if (!VALID.styles.includes(s)) errors.push(`styles: ${s}`);
  }
  if (u.spending && !VALID.spending.includes(u.spending))
    errors.push(`spending: ${u.spending}`);
  if (a.answerStyle && !VALID.answerStyle.includes(a.answerStyle))
    errors.push(`answerStyle: ${a.answerStyle}`);

  return errors;
}

module.exports = {
  load,
  save,
  getDefault,
  validate,
  VALID,
};
