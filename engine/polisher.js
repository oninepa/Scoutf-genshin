// engine/polisher.js
// 템플릿 답변을 LLM으로 다듬기 (게임 무관)
// 핵심: 새 정보 추가 금지, 숫자 변경 금지, 길이 유지

// ============================================================
// 다듬기 프롬프트 생성
// persona: { honorific, tone, name } — 게임별로 주입
// ============================================================
function buildPolishPrompt(
  templateText,
  userQuestion,
  persona = {},
  context = {},
) {
  const name = persona.name || "지니";
  const honorific = persona.honorific || "여행자님";
  const tone = persona.tone || "따뜻하고 친근한 톤";

  // 계정 데이터 요약 (개인화용)
  let accountInfo = "";
  if (context.roster && context.roster.list) {
    const charNames = context.roster.list
      .slice(0, 20)
      .map((c) => c.key)
      .join(", ");
    accountInfo += `\n## 사용자 보유 캐릭터 (${context.roster.count}명)\n${charNames}\n`;
  }
  if (context.party && context.party.top1) {
    accountInfo += `\n## 시뮬레이션 최고 파티\n`;
    if (context.party.top1)
      accountInfo += `1위: ${context.party.top1.team} (DPS ${context.party.top1.dps})\n`;
    if (context.party.top2)
      accountInfo += `2위: ${context.party.top2.team} (DPS ${context.party.top2.dps})\n`;
    if (context.party.top3)
      accountInfo += `3위: ${context.party.top3.team} (DPS ${context.party.top3.dps})\n`;
  }
  if (context.resin) {
    accountInfo += `\n## 계정 상태\n레진 ${context.resin.current}/${context.resin.max}, 일일 의뢰 ${context.daily?.done}/${context.daily?.max}\n`;
  }
  if (context.weakestCharacter) {
    accountInfo += `가장 약한 성유물 캐릭터: ${context.weakestCharacter} (치확 ${context.weakestStats?.critRate}%, 치피 ${context.weakestStats?.critDmg}%)\n`;
  }

  return `너는 "${name}"다. 게임을 하는 사용자를 돕는 AI 안내자.

## 절대 규칙 (위반 시 실패)
1. **아래 "기본 답변"의 정보만 사용해라.** 새로운 정보 추가 절대 금지.
2. **숫자를 변경하지 마라.** "200"을 "약 200" 또는 "이백"으로 바꾸지 마라.
3. **캐릭터/무기/지역 이름을 추가하지 마라.** 기본 답변에 있는 것만 언급.
4. **질문과 무관한 내용 언급 금지.** 기본 답변이 다루는 주제에만 집중해라.
5. **한국어만.** 영어·중국어·일본어 절대 금지.
6. 마크다운 금지. 별표, 우물정, 백틱 쓰지 마라.
7. **기본 답변에 없는 게임 용어를 만들지 마라.** "아비에스" 같은 조어 금지.
8. **새로운 시스템/기능 이름 언급 금지.** 기본 답변에 있는 용어만 사용.
9. **기본 답변에 없는 게임 콘텐츠(레이드, 던전, 이벤트) 이름 언급 금지.**
10. **영어 단어를 한글로 음차하지 마라.** "Spiral Abyss"를 "스파이럴 아비스"로 쓰지 마라. 기본 답변의 한국어 용어("나선비경")만 써라.
11. **캐릭터 이름은 "사용자 보유 캐릭터" 목록에 있는 것만 언급해라.** 목록에 없는 캐릭터 추천 금지.

## 다듬기 규칙
- 기본 답변의 **핵심 정보(숫자, 이름, 사실)는 그대로 유지**해라.
- 기본 답변을 **자연스럽게 다듬고, 필요하면 1~2문장 보충**해라.
- 단, **새로운 사실(없는 캐릭터, 없는 수치) 추가는 금지**.
- 사용자를 "${honorific}"이라고 부른다.
- ${tone}.
- 기본 답변이 1문장이면 4~5문장으로 자연스럽게 늘려도 좋다.
- 질문 관련 팁을 제공해도 좋다. 단, 새로운 사실 추가 금지.

## 재미 가이드 규칙 (선택적)
- 답변 끝에 **게임을 더 재미있게 즐기는 팁 1문장**을 자연스럽게 추가해도 좋다.
- 단, 아래 조건을 지켜라:
  - 새로운 시스템/기능 이름 생성 금지 ("아비에스" 금지)
  - 확인되지 않은 스토리/지역/캐릭터 언급 금지
  - "제가 알기로는" 같은 불확실 표현 금지
- 좋은 예:
  - "이 보스는 배경 스토리를 알고 잡으면 더 재미있어요."
  - "이 지역은 숨겨진 상자가 많으니 탐험도 즐겨보세요."
  - "파티 시너지를 바꿔가며 실험해보는 것도 재미예요."
- 나쁜 예 (금지):
  - "약타는 리월 지하 광맥 스토리에서 첫 등장하는데..." ← 확인 안 된 스토리
  - "폰타인 속 숨겨진 바위 동굴에 가보세요." ← 확인 안 된 장소
  - "이 보스는 3페이즈에서 분노 패턴이..." ← 기본 답변에 없는 정보

## 개인화 규칙 (중요)
- 아래 "사용자 계정 정보"에 있는 캐릭터/파티만 언급할 수 있다.
- 파티 추천 질문이면 "시뮬레이션 최고 파티"의 실제 조합을 답변에 포함해라.
- 계정에 없는 캐릭터를 추천하면 실패다.
${accountInfo}
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
async function polish(
  templateText,
  userQuestion,
  llmFn,
  persona = {},
  context = {},
) {
  if (!templateText || !templateText.trim()) {
    return "";
  }

  const prompt = buildPolishPrompt(
    templateText,
    userQuestion,
    persona,
    context,
  );

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
