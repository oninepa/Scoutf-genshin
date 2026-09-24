// advisor/context.js
// 계정 데이터를 LLM 프롬프트용 텍스트로 변환
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data-pipeline", "output");
const SPIKE_DIR = path.join(__dirname, "..", "spike", "output");

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    return null;
  }
}

// ============================================================
// 옵션/스탯 한국어 매핑
// ============================================================
const SLOT_KR = {
  "Flower of Life": "꽃",
  "Plume of Death": "깃털",
  "Sands of Eon": "모래시계",
  "Goblet of Eonothem": "성배",
  "Circlet of Logos": "왕관",
  EQUIP_BRACER: "꽃",
  EQUIP_NECKLACE: "깃털",
  EQUIP_SHOES: "모래시계",
  EQUIP_RING: "성배",
  EQUIP_DRESS: "왕관",
};

const STAT_KR = {
  HP: "HP",
  "HP%": "HP%",
  ATK: "공격력",
  "ATK%": "공격력%",
  DEF: "방어력",
  "DEF%": "방어력%",
  "CRIT Rate": "치명타 확률",
  "CRIT DMG": "치명타 피해",
  "Energy Recharge": "원소 충전 효율",
  "Elemental Mastery": "원소 마스터리",
  "Healing Bonus": "치유 보너스",
  "Pyro DMG Bonus": "불 원소 피해",
  "Cryo DMG Bonus": "얼음 원소 피해",
  "Geo DMG Bonus": "바위 원소 피해",
  "Hydro DMG Bonus": "물 원소 피해",
  "Electro DMG Bonus": "번개 원소 피해",
  "Anemo DMG Bonus": "바람 원소 피해",
  "Dendro DMG Bonus": "풀 원소 피해",
  "Physical DMG Bonus": "물리 피해",
};

function statKR(type) {
  return STAT_KR[type] || type;
}

function slotKR(slot) {
  return SLOT_KR[slot] || slot;
}

// 계정 요약 텍스트 생성
function buildContext(uid) {
  const hoyo = loadJson(path.join(DATA_DIR, `hoyolab_${uid}.json`));
  const results = loadJson(path.join(SPIKE_DIR, "results.json"));

  if (!hoyo) {
    return `[계정 정보 없음]\nUID: ${uid}\n파싱이 필요합니다.`;
  }

  const lines = [];
  const n = hoyo.notes || {};

  lines.push(`[계정 정보]`);
  lines.push(`- UID: ${uid}`);

  // 일일
  if (hoyo.notes) {
    lines.push(`- 레진: 현재 ${n.resin}, 최대 ${n.max_resin}`);
    lines.push(
      `- 일일 의뢰: ${n.commissions_done}개 완료, 총 ${n.commissions_max}개`,
    );
    lines.push(
      `- 파견: ${(n.expeditions || []).length}개 진행 중, 최대 ${n.max_expeditions}개`,
    );
    lines.push(
      `- 선계 화폐: 현재 ${n.realm_currency}, 최대 ${n.max_realm_currency}`,
    );
    lines.push(`- 주간 보스 할인 횟수: ${n.resin_discounts_left}회`);
  }

  // 나선
  if (hoyo.abyss) {
    lines.push(`- 나선비경 최고층: ${hoyo.abyss.max_floor}`);
    lines.push(`- 이번 시즌 별: ${hoyo.abyss.total_stars}`);
  }

  // 일기
  if (hoyo.diary) {
    lines.push(`- 이번 달 원석: ${hoyo.diary.current_primogems}`);
  }

  // 통계
  if (hoyo.stats) {
    const s = hoyo.stats;
    lines.push("");
    lines.push(`[계정 통계]`);
    lines.push(`- 업적: ${s.achievements}`);
    lines.push(`- 플레이 일수: ${s.days_active}일`);
    lines.push(`- 보유 캐릭터: ${s.characters}명`);
    lines.push(
      `- 신瞳: 바람 ${s.anemoculi}, 바위 ${s.geoculi}, 번개 ${s.electroculi}, 풀 ${s.dendroculi}, 물 ${s.hydroculi}, 불 ${s.pyroculi}`,
    );
    lines.push(
      `- 보물상자: 일반 ${s.common_chests}, 정교 ${s.exquisite_chests}, 진귀 ${s.precious_chests}, 호화 ${s.luxurious_chests}, 기묘 ${s.remarkable_chests}`,
    );
  }

  // 선계
  if (hoyo.teapot) {
    const t = hoyo.teapot;
    lines.push("");
    lines.push(`[선계]`);
    lines.push(`- 레벨: ${t.level}`);
    lines.push(`- 쾌적도: ${t.comfort} (${t.comfort_name})`);
    lines.push(`- 아이템: ${t.items}개`);
    lines.push(`- 방문자: ${t.visitors}명`);
    if (t.realms && t.realms.length > 0) {
      lines.push(`- 보유 선계: ${t.realms.map((r) => r.name).join(", ")}`);
    }
  }

  // 탐험 (별바다 세계 포함)
  if (hoyo.explorations && hoyo.explorations.length > 0) {
    lines.push("");
    lines.push(`[탐험 지역 - ${hoyo.explorations.length}개]`);
    hoyo.explorations.slice(0, 10).forEach((e) => {
      const pct = rawToPercent(e.explored);
      const status = pct >= 100 ? " (완료)" : pct >= 50 ? "" : " (미완)";
      lines.push(`- ${e.name}: ${pct}%${status}`);
    });
    if (hoyo.explorations.length > 10) {
      lines.push(`... 외 ${hoyo.explorations.length - 10}개`);
    }
  }

  // 캐릭터
  if (hoyo.roster && hoyo.roster.length > 0) {
    lines.push("");
    lines.push(`[보유 캐릭터 - ${hoyo.roster.length}명]`);

    // 5성만 먼저 (요약, 한국어 이름)
    const fiveStars = hoyo.roster.filter((c) => c.rarity === 5);
    lines.push(
      `★5성 캐릭터 (${fiveStars.length}명, 이들은 5성이다): ${fiveStars.map((c) => c.key).join(", ")}`,
    );

    // 주요 캐릭터 상세 (레벨 70+ 5성)
    const mainChars = hoyo.roster
      .filter((c) => c.rarity === 5 && c.level >= 70)
      .slice(0, 5);

    if (mainChars.length > 0) {
      lines.push("");
      lines.push(`[주요 캐릭터 상세]`);
      mainChars.forEach((c) => {
        const w = c.weapon || {};
        const weaponStr = w.key ? `${w.key} R${w.refinement || 1}` : "없음";

        // 성유물 스탯 합계
        const stats = calcArtifactStats(c.artifacts);
        const setStr = summarizeSets(c.artifacts);

        const rarityStr = c.rarity === 5 ? "5성" : `${c.rarity}성`;
        lines.push(
          `${c.key} (${rarityStr}) Lv.${c.level} C${c.constellation || 0} | 무기: ${weaponStr}`,
        );
        lines.push(`  성유물 세트: ${setStr}`);
        lines.push(
          `  성유물 스탯: 치확 ${stats.critRate.toFixed(1)}% | 치피 ${stats.critDmg.toFixed(1)}% | 공% ${stats.atkPct.toFixed(1)}% | 원충 ${stats.er.toFixed(1)}% | 원마 ${stats.em}`,
        );

        // 판정 (조언용)
        const verdict = judgeArtifact(stats);
        lines.push(`  → ${verdict}`);
      });
    }
  }

  // 시뮬레이션 결과
  if (results && results.length > 0) {
    lines.push("");
    lines.push(`[시뮬레이션 - 최적 파티 TOP 3]`);
    results.slice(0, 3).forEach((r, i) => {
      if (r.dps) {
        const partyName = (r.party || "").replace(/_/g, " + ");
        lines.push(`${i + 1}. ${partyName} (${r.dps} 딜량)`);
      }
    });
  }

  return lines.join("\n");
}

// ============================================================
// 성유물 스탯 계산
// ============================================================
function calcArtifactStats(artifacts) {
  const stats = {
    critRate: 0,
    critDmg: 0,
    atkPct: 0,
    er: 0,
    em: 0,
  };

  if (!artifacts || artifacts.length === 0) return stats;

  artifacts.forEach((a) => {
    // 주옵도 합산
    if (a.mainStat) {
      const t = a.mainStat.type;
      const v = parseFloat(a.mainStat.value) || 0;
      if (t === "CRIT Rate") stats.critRate += v;
      else if (t === "CRIT DMG") stats.critDmg += v;
      else if (t === "ATK%" || t === "ATK") {
        if (a.mainStat.isPercent) stats.atkPct += v;
      } else if (t === "Energy Recharge") stats.er += v;
      else if (t === "Elemental Mastery") stats.em += v;
    }

    // 부옵 합산
    (a.substats || []).forEach((s) => {
      const t = s.type;
      const v = parseFloat(s.value) || 0;
      if (t === "CRIT Rate") stats.critRate += v;
      else if (t === "CRIT DMG") stats.critDmg += v;
      else if (t === "ATK%" || t === "ATK") {
        if (s.isPercent) stats.atkPct += v;
      } else if (t === "Energy Recharge") stats.er += v;
      else if (t === "Elemental Mastery") stats.em += v;
    });
  });

  return stats;
}

// ============================================================
// 성유물 세트 요약
// ============================================================
function summarizeSets(artifacts) {
  if (!artifacts || artifacts.length === 0) return "없음";
  const setCount = {};
  artifacts.forEach((a) => {
    const name = a.setName || "?";
    setCount[name] = (setCount[name] || 0) + 1;
  });
  return Object.entries(setCount)
    .map(([name, count]) => `${name} ${count}세트`)
    .join(", ");
}

// ============================================================
// 성유물 판정 (조언용)
// ============================================================
function judgeArtifact(stats) {
  const issues = [];

  // 딜러 기준 (치확 50%, 치피 100% 이상이면 OK)
  if (stats.critRate < 30) issues.push("치확 낮음");
  if (stats.critDmg < 80) issues.push("치피 낮음");
  if (stats.er < 100 && stats.er > 0) issues.push("원충 부족");

  if (issues.length === 0) {
    return "성유물 상태 양호";
  }
  return `성유물 파밍 시급 (${issues.join(", ")})`;
}

// ============================================================
// raw_explored → 게임 퍼센트 변환
// ============================================================
function rawToPercent(raw) {
  if (!raw || raw === 0) return 0;
  // 600을 100% 기준으로 (추정)
  const pct = (raw / 600) * 100;
  return Math.min(100, Math.round(pct * 10) / 10);
}

module.exports = { buildContext };
