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
// 옵션/슬롯 한국어 매핑
// ============================================================
const SLOT_KR = {
  EQUIP_BRACER: "꽃",
  EQUIP_NECKLACE: "깃털",
  EQUIP_SHOES: "모래시계",
  EQUIP_RING: "성배",
  EQUIP_DRESS: "왕관",
};

const STAT_KR = {
  FIGHT_PROP_HP: "HP",
  FIGHT_PROP_HP_PERCENT: "HP퍼센트",
  FIGHT_PROP_ATTACK: "공격력",
  FIGHT_PROP_ATTACK_PERCENT: "공격력퍼센트",
  FIGHT_PROP_DEFENSE: "방어력",
  FIGHT_PROP_DEFENSE_PERCENT: "방어력퍼센트",
  FIGHT_PROP_CRITICAL: "치명타확률",
  FIGHT_PROP_CRITICAL_HURT: "치명타피해",
  FIGHT_PROP_CHARGE_EFFICIENCY: "원소충전효율",
  FIGHT_PROP_ELEMENT_MASTERY: "원소마스터리",
  FIGHT_PROP_HEAL_ADD: "치유보너스",
  FIGHT_PROP_FIRE_ADD_HURT: "불원소피해",
  FIGHT_PROP_ICE_ADD_HURT: "얼음원소피해",
  FIGHT_PROP_ROCK_ADD_HURT: "바위원소피해",
  FIGHT_PROP_WATER_ADD_HURT: "물원소피해",
  FIGHT_PROP_ELEC_ADD_HURT: "번개원소피해",
  FIGHT_PROP_WIND_ADD_HURT: "바람원소피해",
  FIGHT_PROP_GRASS_ADD_HURT: "풀원소피해",
  FIGHT_PROP_PHYSICAL_ADD_HURT: "물리피해",
};

function statKR(type) {
  return STAT_KR[type] || type.replace("FIGHT_PROP_", "");
}

function slotKR(slot) {
  return SLOT_KR[slot] || slot.replace("EQUIP_", "");
}

// 계정 요약 텍스트 생성
function buildContext(uid) {
  const roster = loadJson(path.join(DATA_DIR, `roster_${uid}.json`));
  const hoyolab = loadJson(path.join(DATA_DIR, `hoyolab_${uid}.json`));
  const results = loadJson(path.join(SPIKE_DIR, "results.json"));

  const lines = [];

  lines.push(`[계정 정보]`);
  lines.push(`- UID: ${uid}`);

  if (hoyolab?.notes) {
    const n = hoyolab.notes;
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
    lines.push(`- 주간 보스 할인 남음: ${n.resin_discounts_left}회`);
  }

  if (hoyolab?.abyss) {
    lines.push(`- 나선비경 최고층: ${hoyolab.abyss.max_floor}`);
    lines.push(`- 이번 시즌 별: ${hoyolab.abyss.total_stars}`);
  }

  if (hoyolab?.diary) {
    lines.push(`- 이번 달 원석: ${hoyolab.diary.current_primogems}`);
  }

  lines.push("");
  lines.push(`[보유 캐릭터]`);
  if (roster) {
    roster.forEach((c, i) => {
      const w = c.weapon || {};
      const talent = c.talent || {};
      lines.push(
        `${i + 1}. ${c.key} Lv.${c.level} 별자리${c.constellation} ` +
          `특성 ${talent.auto}/${talent.skill}/${talent.burst} ` +
          `무기: ${w.key || "없음"} Lv.${w.level || 0}`,
      );

      if (c.artifacts && c.artifacts.length > 0) {
        c.artifacts.forEach((a) => {
          const mainVal = a.mainStat.isPercent
            ? `${(a.mainStat.value * 100).toFixed(1)}퍼센트`
            : a.mainStat.value;
          const subStr = (a.substats || [])
            .map((s) => {
              const v = s.isPercent
                ? `${(s.value * 100).toFixed(1)}퍼센트`
                : s.value.toFixed(0);
              return `${statKR(s.type)} ${v}`;
            })
            .join(", ");
          lines.push(
            `    - ${a.setName} ${slotKR(a.slot)} +${a.level} (${a.rarity}성) 주옵: ${statKR(a.mainStat.type)} ${mainVal} | 부옵: ${subStr}`,
          );
        });
      }
    });
  }

  if (results && results.length > 0) {
    lines.push("");
    lines.push(`[시뮬레이션 결과 - 약타 상대 TOP 10]`);
    results.slice(0, 10).forEach((r, i) => {
      if (r.dps) {
        const partyName = (r.party || "").replace(/_/g, " + ");
        lines.push(`${i + 1}. ${partyName} 조합, ${r.dps} 데미지`);
      }
    });
  }

  return lines.join("\n");
}

module.exports = { buildContext };
