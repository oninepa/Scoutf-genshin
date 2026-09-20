// advisor/local-brain/classifier.js
// 질문 → 타입 (키워드 기반, 0.001초)

const RULES = [
  {
    type: "greeting",
    keys: ["안녕", "하이", "헬로", "반가", "ㅎㅇ", "hi", "hello"],
  },
  { type: "character", keys: ["상태", "스펙", "스탯"] },
  { type: "thanks", keys: ["고마", "감사", "땡큐", "thank"] },
  { type: "meta", keys: ["너는 누구", "지니 누구", "정체", "뭐야 너"] },
  { type: "character", keys: ["상태", "스펙", "스탯"] },
  { type: "resin", keys: ["레진", "resin", "기름"] },
  { type: "daily", keys: ["일일", "의뢰", "숙제", "데일리", "커미션"] },
  { type: "expedition", keys: ["파견", "탐사"] },
  { type: "realm", keys: ["선계", "주전자", "화폐"] },
  { type: "abyss", keys: ["나선", "심연", "층", "별"] },
  { type: "party", keys: ["파티", "조합", "팀", "딜", "누가 쌔", "누가 세"] },
  { type: "artifact", keys: ["성유물", "옵션", "치명타", "부옵", "주옵"] },
  { type: "roster", keys: ["캐릭터", "보유", "내 캐릭", "몇명"] },
  { type: "top", keys: ["1등", "최강", "제일 쌔", "제일 세", "탑", "top"] },
];

function classify(input) {
  const t = input.toLowerCase().trim();
  for (const r of RULES) {
    for (const k of r.keys) {
      if (t.includes(k)) return r.type;
    }
  }
  return null; // 매칭 실패 → LLM
}

module.exports = { classify };
