// engine/template-engine.js
// 게임 무관 템플릿 엔진
// - 템플릿 로드
// - 키워드 매칭 + 조건 평가
// - 변수 치환

const fs = require("fs");
const path = require("path");

// ============================================================
// 템플릿 로드
// ============================================================
function loadTemplates(templatesPath) {
  const raw = fs.readFileSync(templatesPath, "utf-8");
  const data = JSON.parse(raw);
  if (!data.templates || !Array.isArray(data.templates)) {
    throw new Error("templates.json 형식 오류: templates 배열 필요");
  }
  return data;
}

// ============================================================
// 조건 평가 (안전한 eval 대체)
// ============================================================
// condition: "resin.isFull && facts.weakestCharacter"
// context: { resin: {isFull: true}, facts: {weakestCharacter: "플린스"} }
// ============================================================
function evaluateCondition(condition, context) {
  if (!condition) return true;

  try {
    // context의 키를 변수로 노출
    const keys = Object.keys(context);
    const values = keys.map((k) => context[k]);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return (${condition});`);
    return Boolean(fn(...values));
  } catch (e) {
    console.warn(`[engine] 조건 평가 실패: ${condition} / ${e.message}`);
    return false;
  }
}

// ============================================================
// 키워드 매칭
// ============================================================
// input: "레진 어디 쓸까?"
// keywords: ["레진", "쓸까"]
// → 키워드 중 하나라도 포함되면 매칭 (AND로 하려면 모두 포함)
// ============================================================
function matchKeywords(input, keywords) {
  if (!keywords || keywords.length === 0) return true;
  if (!input) return false;
  const lower = input.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ============================================================
// 변수 치환
// ============================================================
// text: "레진 {resin.current}이 남았어요"
// context: { resin: { current: 200 } }
// → "레진 200이 남았어요"
// ============================================================
function substitute(text, context) {
  return text.replace(/\{([^}]+)\}/g, (match, pathStr) => {
    const value = getNestedValue(context, pathStr.trim());
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

function getNestedValue(obj, pathStr) {
  return pathStr.split(".").reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, obj);
}

// ============================================================
// 템플릿 선택
// ============================================================
// input: 사용자 질문
// context: facts (resin, daily, roster 등)
// 반환: { id, text } 또는 null
// ============================================================
function pickTemplate(templates, input, context) {
  const candidates = [];

  for (const tpl of templates) {
    // 1. 키워드 매칭
    if (!matchKeywords(input, tpl.match?.keywords)) continue;

    // 2. 조건 평가
    if (!evaluateCondition(tpl.match?.condition, context)) continue;

    candidates.push(tpl);
  }

  if (candidates.length === 0) return null;

  // 3. priority 높은 것 선택 (동률이면 먼저 정의된 것)
  candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const picked = candidates[0];
  return {
    id: picked.id,
    text: substitute(picked.text, context),
    priority: picked.priority || 0,
  };
}

// ============================================================
// 모듈 export
// ============================================================
module.exports = {
  loadTemplates,
  pickTemplate,
  substitute,
  evaluateCondition,
  matchKeywords,
};
