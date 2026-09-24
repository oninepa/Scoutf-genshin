// advisor/chat-api.js
// Pointip-Free — 챗봇 API (템플릿 엔진 기반)

const path = require("path");
const decrypt = require("./decrypt");
const localBrain = decrypt.loadLocalBrain();
const { buildContext } = require("./context");
const profile = require("./profile");
const engine = require("../engine/template-engine");
const analyzer = require("./assets/games/genshin/analyzer");
const askedQuestions = new Set();

const UID = "784667533";
const SKIP_LLM_TYPES = ["greeting", "thanks", "meta"];

// ============================================================
// 답변 스타일
// ============================================================
const STYLE_LENGTH = {
  detail: "6~8문장. 자세히 설명",
  normal: "2~4문장. 간결하게",
  simple: "1~2문장. 핵심만",
};

const STYLE_LABEL = {
  story: "스토리/세계관",
  collection: "캐릭터 수집",
  resource: "자원 수집",
  abyss: "나선비경",
  theater: "환상극",
  leyline: "지맥 제압전",
  realm: "선계",
  seaborn: "별바다 세계",
};

const LEVEL_LABEL = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

const SPENDING_LABEL = {
  none: "무과금",
  light: "소과금 (공월+기행)",
  medium: "중과금",
  heavy: "핵과금",
};

// ============================================================
// 템플릿 캐시
// ============================================================
let templatesCache = null;

function getTemplates() {
  if (!templatesCache) {
    const p = path.join(
      __dirname,
      "assets",
      "games",
      "genshin",
      "templates.json",
    );
    templatesCache = engine.loadTemplates(p);
  }
  return templatesCache;
}

// ============================================================
// 시스템 프롬프트 (LLM 폴백용, 지금은 미사용)
// ============================================================
function buildSystemPrompt(prof) {
  const template = decrypt.getSystemPrompt();

  const u = prof.user || {};
  const a = prof.ai || {};

  const level = LEVEL_LABEL[u.level] || "중급";
  const spending = SPENDING_LABEL[u.spending] || "무과금";
  const styles = (u.styles || []).map((s) => STYLE_LABEL[s]).filter(Boolean);
  const playMode = (u.playMode || [])
    .map((m) => (m === "solo" ? "혼자" : "다중"))
    .join(", ");
  const answerStyle = a.answerStyle || "normal";
  const lengthHint = STYLE_LENGTH[answerStyle] || STYLE_LENGTH.normal;
  const stylesText = styles.length > 0 ? styles.join(", ") : "(아직 미설정)";

  return template
    .replace(/\$\{level\}/g, level)
    .replace(/\$\{playMode \|\| "\(미설정\)"\}/g, playMode || "(미설정)")
    .replace(/\$\{stylesText\}/g, stylesText)
    .replace(/\$\{spending\}/g, spending)
    .replace(/\$\{lengthHint\}/g, lengthHint);
}

// ============================================================
// 팩트 캐시
// ============================================================
let contextCache = null;

function getContext() {
  if (!contextCache) {
    try {
      contextCache = buildContext(UID);
    } catch {
      contextCache = "(데이터 없음)";
    }
  }
  return contextCache;
}

function refreshContext() {
  contextCache = null;
}

// ============================================================
// 1단계: 로컬 브레인 즉답
// ============================================================
async function chatLocal(input) {
  if (!input || !input.trim()) {
    return { ok: false, message: "빈 질문입니다." };
  }

  askedQuestions.add(input.trim());

  const local = localBrain.tryLocal(UID, input);

  if (local) {
    const skipLLM = SKIP_LLM_TYPES.includes(local.type);
    return {
      ok: true,
      type: local.type,
      local: local.answer,
      skipLLM,
    };
  }

  return {
    ok: true,
    type: null,
    local: "",
    skipLLM: false,
  };
}

// ============================================================
// 2단계: 템플릿 엔진 (LLM 대체)
// ============================================================
async function chatLLM(input, localAnswer, accountIndex = 1) {
  if (!input || !input.trim()) {
    return { ok: false, message: "빈 질문입니다." };
  }

  // 스킵 타입 체크
  if (localAnswer) {
    const local = localBrain.tryLocal(UID, input);
    if (local && SKIP_LLM_TYPES.includes(local.type)) {
      return { ok: true, llm: "" };
    }
  }

  // 로컬 브레인이 이미 답했으면 스킵 (중복 방지)
  if (localAnswer && localAnswer.trim()) {
    return { ok: true, llm: "" };
  }

  try {
    // facts 가져오기
    const facts = localBrain.getFacts ? localBrain.getFacts(UID) : null;
    if (!facts) {
      return { ok: true, llm: "" };
    }

    // analyzer로 context 생성
    const context = analyzer.analyze(facts, facts.roster || [], {
      teapot: facts.teapot,
      explorations: facts.explorations,
      stats: facts.stats,
    });

    // 템플릿 매칭
    const templates = getTemplates();
    const result = engine.pickTemplate(templates.templates, input, context);

    if (result) {
      return { ok: true, llm: result.text, templateId: result.id };
    }

    // 매칭 실패 → 빈 응답
    return { ok: true, llm: "" };
  } catch (e) {
    console.warn("[chatLLM] 에러:", e.message);
    return { ok: false, message: e.message };
  }
}

// ============================================================
// 동적 질문 제안
// ============================================================
function getSuggestions(accountIndex = 1) {
  const facts = localBrain.getFacts ? localBrain.getFacts(UID) : null;
  const prof = profile.load(accountIndex);
  const suggestions = [];

  if (facts) {
    if (facts.resin?.isFull) {
      suggestions.push("레진 어디에 쓸까?");
    } else if (facts.resin?.current >= 100) {
      suggestions.push("레진 어떻게 쓸까?");
    } else if (facts.resin?.current < 40) {
      suggestions.push("레진 회복 시간은?");
    }

    if (!facts.daily?.isComplete) {
      suggestions.push("오늘 일일 뭐 남았어?");
    } else {
      suggestions.push("오늘 뭐 하면 좋을까?");
    }

    if (facts.roster && facts.roster.length > 0) {
      suggestions.push("내 캐릭터 티어 알려줘");
      suggestions.push("성유물 파밍해야 해?");
    }
  }

  const styles = prof.user?.styles || [];
  if (styles.includes("abyss")) suggestions.push("나선비경 조언");
  if (styles.includes("story")) suggestions.push("스토리 진행 팁");
  if (styles.includes("collection")) suggestions.push("뽑기 추천");
  if (styles.includes("theater")) suggestions.push("환상극 팁");
  if (styles.includes("realm")) suggestions.push("선계 배치 팁");
  if (styles.includes("resource")) suggestions.push("자원 파밍 추천");

  const level = prof.user?.level || "intermediate";
  if (level === "beginner") {
    suggestions.push("초보자가 먼저 할 일은?");
  } else if (level === "advanced") {
    suggestions.push("최적화 팁 알려줘");
  } else {
    suggestions.push("효율 좋은 파밍 루트는?");
  }

  suggestions.push("가장 센 캐릭터는?");
  suggestions.push("오늘 뭐 먹을까?");

  const unique = [...new Set(suggestions)];
  let fresh = unique.filter((s) => !askedQuestions.has(s));

  // 모두 물어봤으면 리셋
  if (fresh.length === 0) {
    askedQuestions.clear();
    fresh = unique;
  }

  // 부족하면 새 질문으로 채우기 (이미 물어본 것 제외)
  const defaults = [
    "다이루크 상태는?",
    "파티 추천해줘",
    "레진 남았어?",
    "오늘 일일 뭐 남았어?",
    "뽑기 추천",
    "오늘의 운세 알려줘",
    "내 캐릭터 티어 알려줘",
    "성유물 파밍해야 해?",
    "가장 센 캐릭터는?",
    "선계 상태 어때?",
  ];
  for (const d of defaults) {
    if (fresh.length >= 6) break;
    if (!fresh.includes(d) && !askedQuestions.has(d)) {
      fresh.push(d);
    }
  }

  // 그래도 부족하면 그냥 채움
  for (const d of defaults) {
    if (fresh.length >= 6) break;
    if (!fresh.includes(d)) fresh.push(d);
  }

  return fresh.slice(0, 6);
}
// ============================================================
// AI 상세 답변 (LLM 사용, 팩트 요약만 전달)
// ============================================================
async function chatAI(input) {
  if (!input || !input.trim()) {
    return { ok: false, message: "빈 질문입니다." };
  }

  try {
    // 팩트 가져오기
    const facts = localBrain.getFacts ? localBrain.getFacts(UID) : null;
    if (!facts) {
      return {
        ok: false,
        message: "계정 데이터가 없습니다. 파싱 후 다시 시도해주세요.",
      };
    }

    // 요약 팩트 생성 (analyzer)
    const context = analyzer.analyze(facts, facts.roster || [], {
      teapot: facts.teapot,
      explorations: facts.explorations,
      stats: facts.stats,
    });

    // LLM에게 보낼 요약 텍스트 (토큰 절약)
    const summary = buildAISummary(context);

    // LLM 호출
    const { chat } = require("./llm-wrapper");
    const sys = `너는 원신 게임 도우미 "지니"다.
사용자 계정 데이터를 보고 정확한 조언을 해라.

## 규칙
1. 한국어만. 영어/중국어/일본어 금지.
2. 마크다운 금지. 별표, 우물정, 백틱 쓰지 마라.
3. 팩트에 없는 캐릭터/지역/아이템 지어내지 마라.
4. 3~5문장으로 간결하게.
5. 구체적인 숫자와 추천 포함.
6. 사용자를 "여행자님"이라고 부른다.

## 답변 구조
1) 현황 요약 (1문장)
2) 문제점/기회 (1~2문장)
3) 구체적 추천 (1~2문장)`;

    const userMsg = `[계정 요약]\n${summary}\n\n[질문]\n${input}`;

    const answer = await chat([
      { role: "system", content: sys },
      { role: "user", content: userMsg },
    ]);

    return { ok: true, answer: answer.trim() };
  } catch (e) {
    console.warn("[chatAI] 에러:", e.message);
    return { ok: false, message: `AI 답변 실패: ${e.message}` };
  }
}

// ============================================================
// LLM용 요약 팩트 생성 (토큰 절약)
// ============================================================
function buildAISummary(ctx) {
  const lines = [];

  // 기본 상태
  lines.push(`레진: ${ctx.resin.current}/${ctx.resin.max}`);
  lines.push(`일일: ${ctx.daily.done}/${ctx.daily.max}`);
  lines.push(`파견: ${ctx.expeditions.current}/${ctx.expeditions.max}`);
  lines.push(`나선: ${ctx.abyss.stars}별`);

  // 전체 캐릭터 목록 (한글)
  const allNames = (ctx.roster.list || [])
    .map((c) => c.keyKo || c.key)
    .join(", ");
  lines.push(`보유 캐릭터 ${ctx.roster.count}명: ${allNames}`);
  lines.push(`그 중 5성: ${ctx.roster.fiveStars}`);

  // 최강 캐릭터
  if (ctx.strongest) {
    lines.push(`최강: ${ctx.strongest.name} (${ctx.strongest.reason})`);
  }

  // 약한 캐릭터
  if (ctx.weakestCharacter && ctx.weakestStats) {
    const cr = ctx.weakestStats.critRate?.toFixed(1) || 0;
    const cd = ctx.weakestStats.critDmg?.toFixed(1) || 0;
    lines.push(`약점: ${ctx.weakestCharacter} (치확 ${cr}%, 치피 ${cd}%)`);
  }

  // 조언
  if (ctx.advice) {
    lines.push(`조언: ${ctx.advice}`);
  }

  // 선계
  if (ctx.teapot) {
    lines.push(`선계: Lv.${ctx.teapot.level}, 쾌적도 ${ctx.teapot.comfort}`);
  }

  return lines.join("\n");
}

module.exports = {
  chatLocal,
  chatLLM,
  chatAI,
  getSuggestions,
  refreshContext,
  buildSystemPrompt,
};
