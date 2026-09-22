// advisor/chat-api.js
// Pointip-Free — 챗봇 API (프로필 반영)

const localBrain = require("./local-brain");
const { chat, chatStream, loadConfig } = require("./llm-wrapper");
const { buildContext } = require("./context");
const profile = require("./profile");
const askedQuestions = new Set();

const UID = "784667533";

const SKIP_LLM_TYPES = ["greeting", "thanks", "meta"];

// ============================================================
// 답변 스타일 → 문장 수
// ============================================================
const STYLE_LENGTH = {
  detail: "6~8문장. 자세히 설명",
  normal: "2~4문장. 간결하게",
  simple: "1~2문장. 핵심만",
};

// ============================================================
// 관심 스타일 → 한국어
// ============================================================
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
// 시스템 프롬프트 (프로필 반영)
// ============================================================
function buildSystemPrompt(prof) {
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

  return `너의 이름은 "지니(Genie)"다. 게임을 하는 사용자를 돕는 AI 안내자.

## 사용자 프로필 (이걸 답변에 반영해라)
- 수준: ${level}
- 플레이 방식: ${playMode || "(미설정)"}
- 관심 스타일: ${stylesText}
- 과금: ${spending}

## 프로필 반영 규칙 (매우 중요)
- ${level} 유저에게 맞는 톤과 난이도로 답한다.
  · 초급: 기본 개념 설명 포함, 어려운 용어 피함
  · 중급: 실전 팁 중심
  · 고급: 최적화·미세 조정 중심
- 관심 스타일 우선: ${stylesText} 중 해당하는 주제를 답변에 반영
- 과금 수준 반영:
  · 무과금: 4성 위주, 자원 낭비 경계, "이건 사지 마세요" 솔직하게
  · 소과금: 공월+기행 효율, 픽업 선택 중요
  · 중/핵과금: 제약 없이 최적 조합 제시

## 정체성
- 특정 게임에 종속되지 않는 중립적 AI 파트너
- 게임 고유명사, NPC 화법 사용 금지

## 말투
- 따뜻하고 친근하게. 살짝 놀리는 유머도 좋다.
- 사용자를 "여행자님" 이라고 부른다.

## 답변 형식 (음성 변환 고려)
1. 마크다운 금지: 별표(*), 우물정(#), 백틱(\`), 하이픈(-) 목록 금지.
2. 이모지 금지.
3. 퍼센트 → "퍼센트", 슬래시 → "또는", 화살표 → "에서".
4. 스탯은 한국어로: HP→체력, ATK→공격력, crit rate→치명타 확률.
5. 숫자는 그대로. 1000 이상은 한글로.
6. 한국어만. 영어·중국어·일본어 절대 금지.

## 사실 규칙
1. 팩트만 사실로 사용. 추측 금지.
2. 팩트에 없는 캐릭터 이름 지어내지 않는다.

## 오타 처리
- "쌘", "쎈" = "센" (강한)

## 길이 (답변 스타일)
- ${lengthHint}`;
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
// 대화 히스토리
// ============================================================
const history = [];

// ============================================================
// 메인 chat
// ============================================================
// ============================================================
// 1단계: 로컬 즉답만 리턴
// ============================================================
// ============================================================
// 1단계: 로컬 즉답만 리턴
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
// 2단계: LLM 부연 (또는 전담)
// ============================================================
async function chatLLM(input, localAnswer, accountIndex = 1) {
  if (!input || !input.trim()) {
    return { ok: false, message: "빈 질문입니다." };
  }

  // 로컬 답변 있으면 스킵 타입 체크
  if (localAnswer) {
    const local = localBrain.tryLocal(UID, input);
    if (local && SKIP_LLM_TYPES.includes(local.type)) {
      return { ok: true, llm: "" };
    }
  }

  const context = getContext();
  const prof = profile.load(accountIndex);
  const systemPrompt = buildSystemPrompt(prof);

  try {
    if (localAnswer) {
      // 로컬 답변에 대한 부연
      const addOn = await getLLMAddOn(
        localAnswer,
        input,
        context,
        systemPrompt,
      );
      return { ok: true, llm: addOn || "" };
    } else {
      // LLM 전담
      let reply = "";
      const onChunk = (chunk) => {
        reply += chunk;
      };

      await chatStream(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: `[팩트]\n${context}` },
          { role: "assistant", content: "네, 확인했습니다." },
          ...history,
          { role: "user", content: input },
        ],
        onChunk,
      );

      history.push({ role: "user", content: input });
      history.push({ role: "assistant", content: reply });
      if (history.length > 10) history.splice(0, 2);

      return { ok: true, llm: reply };
    }
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// ============================================================
// LLM 추가 관점
// ============================================================
async function getLLMAddOn(localAnswer, input, context, systemPrompt) {
  const prof = profile.load();
  const answerStyle = prof.ai?.answerStyle || "normal";
  const lengthHint = STYLE_LENGTH[answerStyle] || STYLE_LENGTH.normal;

  const missions = require("./missions");
  let picked = null;
  try {
    picked = missions.pickForLLM();
  } catch (e) {
    console.warn("   [mission pick 실패]", e.message);
  }

  const missionSection = picked
    ? `

## 마지막 제안 (절대 규칙)
답변 맨 끝에 아래 미션을 "혹시 이런 거 어때요?" 톤으로 자연스럽게 1문장 제안해라.

절대 금지:
- "카테고리:" "미션:" 같은 라벨 출력 금지
- 미션 문구를 그대로 복붙 금지
- 미션을 두 개 이상 제안 금지

반드시 미션을 게임 상황에 맞게 변형해서 말해라.

[내부 참고용 미션]
${picked.mission}`
    : "";

  const sys = `${systemPrompt}

## 이번 답변 특별 지시 (매우 중요)
사용자에게 이미 아래 로컬 답변이 전달되었다.

1. 절대 같은 내용을 반복하지 마라.
2. 숫자를 다시 언급하지 마라.
3. 팩트에 없는 장비·캐릭터·활동 이름을 지어내지 마라.
4. 팩트 상태를 정확히 반영.
5. 답변 스타일: ${lengthHint}
6. 새로운 관점·계산·추천만 이어가라.${missionSection}

[이미 전달된 답변]
${localAnswer}`;

  let addOn = "";
  try {
    await chatStream(
      [
        { role: "system", content: sys },
        { role: "user", content: `[팩트]\n${context}\n\n[질문]\n${input}` },
      ],
      (chunk) => {
        addOn += chunk;
        process.stdout.write(chunk);
      },
    );
    return addOn.trim() || "(빈 응답)";
  } catch (e) {
    console.warn("   [chatStream 실패]", e.message);
    return null;
  }
}

// ============================================================
// 동적 질문 제안
// ============================================================
function getSuggestions(accountIndex = 1) {
  const facts = localBrain.getFacts ? localBrain.getFacts(UID) : null;
  const prof = profile.load(accountIndex);
  const suggestions = [];

  // === 상태 기반 ===
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

    if (facts.top3 && facts.top3.length > 0) {
      suggestions.push("내 캐릭터 티어 알려줘");
    }

    if (facts.characters && facts.characters.length > 0) {
      suggestions.push("내 캐릭터 상태 요약해줘");
    }

    if (facts.weapons && facts.weapons.length > 0) {
      suggestions.push("무기 추천해줘");
    }
  }

  // === 스타일 기반 ===
  const styles = prof.user?.styles || [];
  if (styles.includes("abyss")) suggestions.push("나선비경 조언");
  if (styles.includes("story")) suggestions.push("스토리 진행 팁");
  if (styles.includes("collection")) suggestions.push("뽑기 추천");
  if (styles.includes("theater")) suggestions.push("환상극 팁");
  if (styles.includes("realm")) suggestions.push("선계 배치 팁");
  if (styles.includes("resource")) suggestions.push("자원 파밍 추천");

  // === 수준 기반 ===
  const level = prof.user?.level || "intermediate";
  if (level === "beginner") {
    suggestions.push("초보자가 먼저 할 일은?");
  } else if (level === "advanced") {
    suggestions.push("최적화 팁 알려줘");
  } else {
    suggestions.push("효율 좋은 파밍 루트는?");
  }

  // === 잡학/유머 ===
  suggestions.push("오늘의 운세 알려줘");
  suggestions.push("가장 센 캐릭터는?");
  suggestions.push("오늘 뭐 먹을까?");

  // 중복 제거
  const unique = [...new Set(suggestions)];

  // 이미 물어본 것 제외
  let fresh = unique.filter((s) => !askedQuestions.has(s));

  // 6개 미만이면 기록 리셋
  if (fresh.length < 6) {
    askedQuestions.clear();
    fresh = unique;
  }

  // 기본값 보강
  const defaults = [
    "다이루크 상태는?",
    "파티 추천해줘",
    "레진 남았어?",
    "오늘 일일 뭐 남았어?",
    "뽑기 추천",
    "오늘의 운세 알려줘",
  ];
  for (const d of defaults) {
    if (fresh.length >= 6) break;
    if (!fresh.includes(d)) fresh.push(d);
  }

  return fresh.slice(0, 6);
}

module.exports = {
  chatLocal,
  chatLLM,
  getLLMAddOn,
  getSuggestions,
  refreshContext,
  buildSystemPrompt,
};
