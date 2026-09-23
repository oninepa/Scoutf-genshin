// advisor/assets/games/genshin/analyzer.js
// facts → 템플릿 엔진용 context 변환

function analyze(facts, roster, extra = {}) {
  const context = {
    // 기본
    resin: {
      ...facts.resin,
      discountsLeft: facts.resin?.discountsLeft ?? 0,
    },
    daily: facts.daily,
    expeditions: facts.expeditions,
    realm: facts.realm,
    abyss: facts.abyss,

    // 로스터
    roster: {
      count: roster.length,
      fiveStars: roster
        .filter((c) => c.rarity === 5)
        .slice(0, 6)
        .map((c) => c.keyKo || c.key)
        .join(", "),
      list: roster,
    },

    // 약한 캐릭터 (성유물 기준)
    weakestCharacter: null,
    weakestStats: null,

    // 가장 센 캐릭터 (치확+치피 기준)
    strongest: null,

    // 선계
    teapot: extra.teapot || null,
    explorations: extra.explorations || [],
    stats: extra.stats || null,
  };

  // 성유물 분석 (5성 중 치확+치피 낮은 순)
  const fiveStars = roster.filter((c) => c.rarity === 5);
  const scored = fiveStars
    .map((c) => {
      const stats = calcArtifactStats(c.artifacts);
      return { char: c, stats, score: stats.critRate + stats.critDmg };
    })
    .filter((s) => s.stats.critRate > 0 || s.stats.critDmg > 0);

  if (scored.length > 0) {
    scored.sort((a, b) => a.score - b.score);
    const weakest = scored[0];
    context.weakestCharacter = weakest.char.keyKo || weakest.char.key;
    context.weakestStats = weakest.stats;

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    context.strongest = {
      name: best.char.keyKo || best.char.key,
      reason: `치확 ${best.stats.critRate.toFixed(1)}퍼센트, 치피 ${best.stats.critDmg.toFixed(1)}퍼센트로 균형이 좋습니다.`,
    };
  }

  return context;
}

// 성유물 스탯 계산
function calcArtifactStats(artifacts) {
  const stats = { critRate: 0, critDmg: 0, atkPct: 0, er: 0, em: 0 };
  if (!artifacts || artifacts.length === 0) return stats;

  artifacts.forEach((a) => {
    if (a.mainStat) {
      const t = a.mainStat.type;
      const v = parseFloat(a.mainStat.value) || 0;
      if (t === "CRIT Rate") stats.critRate += v;
      else if (t === "CRIT DMG") stats.critDmg += v;
      else if (t === "ATK%" && a.mainStat.isPercent) stats.atkPct += v;
      else if (t === "Energy Recharge") stats.er += v;
      else if (t === "Elemental Mastery") stats.em += v;
    }
    (a.substats || []).forEach((s) => {
      const t = s.type;
      const v = parseFloat(s.value) || 0;
      if (t === "CRIT Rate") stats.critRate += v;
      else if (t === "CRIT DMG") stats.critDmg += v;
      else if (t === "ATK%" && s.isPercent) stats.atkPct += v;
      else if (t === "Energy Recharge") stats.er += v;
      else if (t === "Elemental Mastery") stats.em += v;
    });
  });

  return stats;
}

module.exports = { analyze, calcArtifactStats };
