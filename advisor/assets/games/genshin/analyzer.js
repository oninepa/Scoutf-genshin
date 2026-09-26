// advisor/assets/games/genshin/analyzer.js
// facts → 템플릿 엔진용 context 변환

function analyze(facts, roster, extra = {}) {
  const userInput = extra.userInput || "";

  const context = {
    // 기본
    resin: {
      ...facts.resin,
      discountsLeft: facts.resin?.discountsLeft ?? 0,
    },
    daily: {
      ...facts.daily,
      left: (facts.daily?.max ?? 4) - (facts.daily?.done ?? 0),
    },
    expeditions: facts.expeditions,
    realm: facts.realm,
    abyss: facts.abyss,

    // 로스터
    roster: {
      count: roster.length,
      fiveStars: roster
        .filter((c) => c.rarity === 5)
        .slice(0, 6)
        .map((c) => c.key)
        .join(", "),
      list: roster,
    },

    // 약한 캐릭터 (성유물 기준)
    weakestCharacter: null,
    weakestStats: null,

    // 가장 센 캐릭터 (치확+치피 기준)
    strongest: null,

    // 질문한 캐릭터
    queried: null,

    // 선계
    teapot: extra.teapot || null,
    explorations: extra.explorations || [],
    stats: extra.stats || null,
  };

  // 성유물 분석 (5성 중 치확+치피 낮은 순)
  const fiveStars = roster.filter(
    (c) => c.rarity === 5 && c.level >= 70 && c.key !== "여행자",
  );
  const scored = fiveStars
    .map((c) => {
      const stats = calcArtifactStats(c.artifacts);
      return { char: c, stats, score: stats.critRate + stats.critDmg };
    })
    .filter((s) => s.stats.critRate > 0 || s.stats.critDmg > 0);

  if (scored.length > 0) {
    scored.sort((a, b) => a.score - b.score);
    const weakest = scored[0];
    context.weakestCharacter = weakest.char.key;
    context.weakestStats = weakest.stats;

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    context.strongest = {
      name: best.char.key,
      reason: `치확 ${best.stats.critRate.toFixed(1)}퍼센트, 치피 ${best.stats.critDmg.toFixed(1)}퍼센트로 균형이 좋습니다.`,
    };
  }

  // 질문한 캐릭터 매칭
  const queriedChar = findCharacterByName(roster, userInput);
  if (queriedChar) {
    context.queried = buildCharacterDetail(queriedChar);
  }

  // advice 생성
  context.advice = buildAdvice(context, roster);
  return context;
}

// 성유물 스탯 계산 (한글/영어 둘 다 지원)
function calcArtifactStats(artifacts) {
  const stats = { critRate: 0, critDmg: 0, atkPct: 0, er: 0, em: 0 };
  if (!artifacts || artifacts.length === 0) return stats;

  // 스탯 이름 매핑 (한글/영어 → 내부 키)
  const isCritRate = (t) => t === "CRIT Rate" || t === "치명타 확률";
  const isCritDmg = (t) => t === "CRIT DMG" || t === "치명타 피해";
  const isAtkPct = (t) => t === "ATK%" || t === "공격력%";
  const isER = (t) => t === "Energy Recharge" || t === "원소 충전 효율";
  const isEM = (t) => t === "Elemental Mastery" || t === "원소 마스터리";

  artifacts.forEach((a) => {
    if (a.mainStat) {
      const t = a.mainStat.type;
      const v = parseFloat(a.mainStat.value) || 0;
      if (isCritRate(t)) stats.critRate += v;
      else if (isCritDmg(t)) stats.critDmg += v;
      else if (isAtkPct(t) && a.mainStat.isPercent) stats.atkPct += v;
      else if (isER(t)) stats.er += v;
      else if (isEM(t)) stats.em += v;
    }
    (a.substats || []).forEach((s) => {
      const t = s.type;
      const v = parseFloat(s.value) || 0;
      if (isCritRate(t)) stats.critRate += v;
      else if (isCritDmg(t)) stats.critDmg += v;
      else if (isAtkPct(t) && s.isPercent) stats.atkPct += v;
      else if (isER(t)) stats.er += v;
      else if (isEM(t)) stats.em += v;
    });
  });

  return stats;
}

// ============================================================
// 상황별 조언 생성
// ============================================================
function buildAdvice(facts, roster) {
  const advices = [];

  // 1. 레진 + 성유물
  if (facts.resin?.isFull && facts.weakestCharacter) {
    advices.push(
      `레진도 가득 찼으니 ${facts.weakestCharacter} 성유물 파밍을 먼저 추천해요.`,
    );
  } else if (facts.resin?.isFull) {
    advices.push(
      `레진이 ${facts.resin.current}으로 가득 찼어요. 지금 쓰셔야 해요.`,
    );
  } else if (facts.resin?.current < 40) {
    advices.push(`레진이 ${facts.resin.current}이라 아직 여유 있어요.`);
  }

  // 2. 일일 + 파견
  if (!facts.daily?.isComplete && facts.expeditions?.isFull) {
    advices.push("일일 끝내고 파견도 회수하세요.");
  } else if (facts.expeditions?.isFull) {
    advices.push("파견이 다 완료됐으니 회수하세요.");
  }

  // 3. 나선
  if (facts.abyss?.stars === 0) {
    advices.push("나선비경은 아직 안 하셨네요. 여유될 때 도전해보세요.");
  } else if (facts.abyss?.starsLeft > 0 && facts.abyss.starsLeft <= 3) {
    advices.push(
      `나선비경 별 ${facts.abyss.starsLeft}개만 더 따면 만점이에요.`,
    );
  }

  // 4. 5성 캐릭터 성유물
  if (facts.weakestCharacter && facts.weakestStats) {
    const cr = facts.weakestStats.critRate || 0;
    if (cr < 20) {
      advices.push(
        `${facts.weakestCharacter}의 치확이 ${cr.toFixed(1)}퍼센트로 낮아서 파밍 시급해요.`,
      );
    }
  }

  // 최대 2개만
  return advices.slice(0, 2).join(" ");
}

// ============================================================
// facts에 advice 추가
// ============================================================
function enrichFacts(facts, roster) {
  facts.advice = buildAdvice(facts, roster);
  return facts;
}

// ============================================================
// 캐릭터 이름 추출 (roster에서 매칭)
// ============================================================
function findCharacterByName(roster, query) {
  if (!roster || !query) return null;
  // 이름이 긴 것부터 매칭 (부분 매칭 방지)
  const sorted = [...roster].sort(
    (a, b) => (b.key?.length || 0) - (a.key?.length || 0),
  );
  for (const c of sorted) {
    if (c.key && query.includes(c.key)) return c;
  }
  return null;
}

// ============================================================
// 캐릭터 상세 정보 생성
// ============================================================
function buildCharacterDetail(char) {
  if (!char) return null;
  const artifacts = char.artifacts || [];

  // calcArtifactStats 재활용 (한글/영어 지원)
  const stats = calcArtifactStats(artifacts);

  return {
    name: char.key,
    level: char.level,
    rarity: char.rarity,
    constellation: char.constellation || 0,
    friendship: char.friendship || 0,
    weapon: char.weapon?.key || "없음",
    weaponLevel: char.weapon?.level || 0,
    weaponRefinement: char.weapon?.refinement || 0,
    artifactCount: artifacts.length,
    critRate: stats.critRate.toFixed(1),
    critDmg: stats.critDmg.toFixed(1),
  };
}

module.exports = {
  analyze,
  calcArtifactStats,
  buildAdvice,
  enrichFacts,
  findCharacterByName,
  buildCharacterDetail,
};
