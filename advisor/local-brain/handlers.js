// advisor/local-brain/handlers.js
// 타입별 즉답 (1문장, 숫자만 빠르게)

const HANDLERS = {
  greeting(f) {
    return "여행자님, 안녕하세요. 지니입니다.";
  },

  thanks(f) {
    return "천만에요, 여행자님.";
  },

  meta(f) {
    return "저는 지니입니다. 게임을 돕는 AI 파트너예요.";
  },

  resin(f) {
    const r = f.resin;
    if (r.isFull) return `레진이 ${r.current}로 가득 찼어요. 지금 쓰셔야 해요.`;
    if (r.current < 40)
      return `레진 ${r.current}이 남았어요. 아직 여유 있습니다.`;
    return `레진 ${r.current}이 남았어요. ${r.hoursToFull}시간 후 꽉 찹니다.`;
  },

  daily(f) {
    const d = f.daily;
    if (d.isComplete) return "오늘 일일 의뢰 다 끝내셨어요. 훌륭합니다.";
    return `일일 의뢰 ${d.done}개 완료, ${d.max - d.done}개 남았어요.`;
  },

  expedition(f) {
    const e = f.expeditions;
    if (e.isFull) return `파견 ${e.current}개 진행 중이에요.`;
    return `파견 ${e.current}개 진행 중, ${e.max - e.current}개 더 보낼 수 있어요.`;
  },

  realm(f) {
    return `선계 화폐 ${f.realm.current} 보유 중이에요.`;
  },

  abyss(f) {
    return `나선비경 별 ${f.abyss.stars}개 획득, ${f.abyss.starsLeft}개 남았어요.`;
  },

  party(f) {
    if (f.top3.length === 0) return "시뮬레이션 결과가 아직 없어요.";
    const t = f.top3[0];
    return `최고 조합은 ${t.team}, 데미지 ${t.damage}입니다.`;
  },

  artifact(f) {
    const c = f.roster[0];
    if (!c) return "성유물 데이터가 없어요.";
    return `${c.key}의 성유물 정보를 확인해드릴게요.`;
  },

  roster(f) {
    return `보유 캐릭터 ${f.roster.length}명이에요.`;
  },

  character(f, input) {
    const names = f.roster.map((c) => c.key);
    const found = names.find((n) => input && input.includes(n));
    if (!found) return "어떤 캐릭터인지 말씀해주세요. 예: 다이루크 상태";

    const c = f.roster.find((x) => x.key === found);
    const w = c.weapon || {};
    const t = c.talent || {};
    return (
      `${c.key} Lv.${c.level}, 별자리 ${c.constellation}, ` +
      `특성 ${t.auto}/${t.skill}/${t.burst}, ` +
      `무기 ${w.key || "없음"} Lv.${w.level || 0}.`
    );
  },

  top(f) {
    if (f.top3.length === 0) return "시뮬레이션 결과가 없어요.";
    const t = f.top3[0];
    return `현재 1위는 ${t.team}, ${t.damage} 데미지입니다.`;
  },
};

function handle(type, facts, input = "") {
  const fn = HANDLERS[type];
  if (!fn) return null;
  return fn(facts, input);
}

module.exports = { handle, HANDLERS };
