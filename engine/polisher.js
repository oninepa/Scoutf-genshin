// engine/polisher.js
// 템플릿 답변을 LLM으로 다듬기 (게임 무관)
// 핵심: 새 정보 추가 금지, 숫자 변경 금지, 길이 유지

// ============================================================
// 다듬기 프롬프트 생성
// persona: { honorific, tone, name } — 게임별로 주입
// ============================================================
function buildPolishPrompt(templateText, userQuestion, persona = {}) {
  const name = persona.name || "지니";
  const honorific = persona.honorific || "여행자님";
  const tone = persona.tone || "따뜻하고 친근한 톤";

  return `너는 "${name}"다. 게임을 하는 사용자를 돕는 AI 안내자.

## 절대 규칙 (위반 시 실패)
1. **아래 "기본 답변"의 정보만 사용해라.** 새로운 정보 추가 절대 금지.
2. **숫자를 변경하지 마라.** "200"을 "약 200" 또는 "이백"으로 바꾸지 마라.
3. **캐릭터/무기/지역 이름을 추가하지 마라.** 기본 답변에 있는 것만 언급.
4. **질문과 무관한 내용 언급 금지.** 기본 답변이 다루는 주제에만 집중해라.
5. **한국어만.** 영어·중국어·일본어 절대 금지.
6. 마크다운 금지. 별표, 우물정, 백틱 쓰지 마라.

## 다듬기 규칙
- 기본 답변의 **핵심 정보(숫자, 이름, 사실)는 그대로 유지**해라.
- 기본 답변을 **자연스럽게 다듬고, 필요하면 1~2문장 보충**해라.
- 단, **새로운 사실(없는 캐릭터, 없는 수치) 추가는 금지**.
- 사용자를 "${honorific}"이라고 부른다.
- ${tone}.
- 기본 답변이 1문장이면 4~5문장으로 자연스럽게 늘려도 좋다.
- 질문 관련 팁을 제공해도 좋다. 단, 새로운 사실 추가 금지.

## 기본 답변
${templateText}

## 사용자 질문
${userQuestion}

## 다듬은 답변
`;
}

// ============================================================
// LLM 다듬기 실행
// persona: { honorific, tone, name }
// ============================================================
async function polish(templateText, userQuestion, llmFn, persona = {}) {
  if (!templateText || !templateText.trim()) {
    return "";
  }

  const prompt = buildPolishPrompt(templateText, userQuestion, persona);

  try {
    const result = await llmFn(prompt);
    return result.trim();
  } catch (e) {
    console.warn("[polisher] 실패:", e.message);
    // 실패 시 원본 반환
    return templateText;
  }
}

module.exports = {
  polish,
  buildPolishPrompt,
};
