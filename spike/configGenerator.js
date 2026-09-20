// configGenerator.js
// 사용법: node configGenerator.js <로스터JSON경로> [파티크기=4] [모드] [몬스터키]
// 모드: fast | normal | safe (기본: normal)
// 몬스터키: output/monsters.json 참조 (기본: ruinguard)
// 예시: node configGenerator.js ../data-pipeline/output/roster_784667533.json 4 normal azhdaha

const fs = require("fs");
const path = require("path");

// 🆕 시뮬레이션 모드별 gcsim 옵션
const MODE_OPTIONS = {
  fast: "iteration=200 workers=2",
  normal: "iteration=1000 workers=8",
  safe: "iteration=1000 workers=1",
};

// 🆕 몬스터 프리셋 로드
let MONSTERS = {};
try {
  MONSTERS = JSON.parse(
    fs.readFileSync(path.join(__dirname, "output", "monsters.json"), "utf-8"),
  );
} catch (e) {
  console.warn("⚠️ monsters.json 없음. target은 허수아비로 처리됩니다.");
}

// 여행자 원소별 gcsim 이름 매핑
const TRAVELER_MAP = {
  Wind: "traveleranemo",
  Rock: "travelergeo",
  Electric: "travelerelectro",
  Grass: "travelerdendro",
  Water: "travelerhydro",
  Fire: "travelerpyro",
  Ice: "travelercryo",
};

// 캐릭터 이름 변환
function resolveCharacterName(char) {
  if (!char) return null;
  if (char.key === "여행자" && char.element) {
    return TRAVELER_MAP[char.element] || "traveleranemo";
  }
  return char.key;
}

// Enka의 FIGHT_PROP_* → gcsim 스탯 이름
function mapStatType(fightProp) {
  const map = {
    FIGHT_PROP_HP: "hp",
    FIGHT_PROP_HP_PERCENT: "hp%",
    FIGHT_PROP_ATTACK: "atk",
    FIGHT_PROP_ATTACK_PERCENT: "atk%",
    FIGHT_PROP_DEFENSE: "def",
    FIGHT_PROP_DEFENSE_PERCENT: "def%",
    FIGHT_PROP_ELEMENT_MASTERY: "em",
    FIGHT_PROP_CHARGE_EFFICIENCY: "er",
    FIGHT_PROP_CRITICAL: "cr",
    FIGHT_PROP_CRITICAL_HURT: "cd",
    FIGHT_PROP_PHYSICAL_ADD_HURT: "phys%",
    FIGHT_PROP_FIRE_ADD_HURT: "pyro%",
    FIGHT_PROP_ELEC_ADD_HURT: "electro%",
    FIGHT_PROP_WATER_ADD_HURT: "hydro%",
    FIGHT_PROP_GRASS_ADD_HURT: "dendro%",
    FIGHT_PROP_WIND_ADD_HURT: "anemo%",
    FIGHT_PROP_ROCK_ADD_HURT: "geo%",
    FIGHT_PROP_ICE_ADD_HURT: "cryo%",
  };
  return map[fightProp] || null;
}

function mapSlot(slot) {
  const map = {
    EQUIP_BRACER: "flower",
    EQUIP_NECKLACE: "plume",
    EQUIP_SHOES: "sands",
    EQUIP_RING: "goblet",
    EQUIP_DRESS: "circlet",
  };
  return map[slot] || null;
}

function formatValue(value, isPercent) {
  if (value === null || value === undefined) return "0";
  if (isPercent) return value.toFixed(4);
  return Math.round(value).toString();
}

function artifactToGcsim(a) {
  const slot = mapSlot(a.slot);
  const mainStat = a.mainStat ? mapStatType(a.mainStat.type) : null;
  const mainVal = a.mainStat
    ? formatValue(a.mainStat.value, a.mainStat.isPercent)
    : "0";

  const subs = (a.substats || [])
    .map((s) => {
      const key = mapStatType(s.type);
      if (!key) return null;
      if (key === "hb") return null;
      return `${key}=${formatValue(s.value, s.isPercent)}`;
    })
    .filter(Boolean)
    .join(" ");

  return { slot, mainStat, mainVal, subs };
}

function characterToGcsim(char) {
  const lines = [];
  const name = resolveCharacterName(char);
  const cons = char.constellation || 0;
  const talent = char.talent || {};
  const t = `${talent.auto || 1},${talent.skill || 1},${talent.burst || 1}`;
  const charLvl = char.level || 90;

  lines.push(`${name} char lvl=${charLvl}/90 cons=${cons} talent=${t};`);

  if (char.weapon) {
    const wLvl = char.weapon.level || 90;
    lines.push(
      `${name} add weapon="${char.weapon.key}" lvl=${wLvl}/90 refine=${char.weapon.refinement || 1};`,
    );
  }

  const setCount = {};
  for (const a of char.artifacts || []) {
    if (a.setName) setCount[a.setName] = (setCount[a.setName] || 0) + 1;
  }
  for (const [setName, count] of Object.entries(setCount)) {
    lines.push(`${name} add set="${setName}" count=${count};`);
  }

  for (const a of char.artifacts || []) {
    const { mainStat, mainVal, subs } = artifactToGcsim(a);
    const parts = [];
    if (mainStat && mainVal !== "0") parts.push(`${mainStat}=${mainVal}`);
    if (subs) parts.push(subs);
    if (parts.length === 0) continue;
    lines.push(`${name} add stats ${parts.join(" ")};`);
  }

  return lines.join("\n");
}

function generateConfig(
  roster,
  partyKeys,
  mode = "normal",
  monsterKey = "ruinguard",
) {
  const opts = MODE_OPTIONS[mode] || MODE_OPTIONS.normal;

  // 🆕 몬스터 스탯
  const monster = MONSTERS[monsterKey] || {
    nameKr: "허수아비",
    hp: 999999999,
    resist: 0.1,
  };

  const partyChars = partyKeys
    .map((key) => roster.find((c) => c.key === key))
    .filter(Boolean);

  const gcsimNames = partyChars.map((c) => resolveCharacterName(c));

  const header = `# gcsim config 자동 생성
# 파티: ${partyKeys.join(" + ")}
# 몬스터: ${monster.nameKr} (${monsterKey})
# 생성일: ${new Date().toISOString()}
# 모드: ${mode}

options swap_delay=12 ${opts};

target lvl=100 hp=${monster.hp} resist=${monster.resist};
`;

  const characters = partyChars.map((c) => characterToGcsim(c)).join("\n\n");

  const activeChar = gcsimNames[0];
  const rotation = `
# 로테이션 (Tier B 폴백: 스킬 → 버스트 순서)
active ${activeChar};
${gcsimNames.map((n) => `${n} skill;`).join("\n")}
${gcsimNames.map((n) => `${n} burst;`).join("\n")}
`;

  return `${header}\n${characters}\n${rotation}`;
}

function combinations(arr, k) {
  const result = [];
  const combine = (start, current) => {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      combine(i + 1, current);
      current.pop();
    }
  };
  combine(0, []);
  return result;
}

function listMonsters() {
  const keys = Object.keys(MONSTERS);
  console.log(`\n📋 사용 가능한 몬스터 (${keys.length}개):\n`);
  keys.forEach((k) => {
    const m = MONSTERS[k];
    console.log(
      `  ${k.padEnd(30)} ${m.nameKr.padEnd(20)} HP ${m.hp.toLocaleString()}, 저항 ${(m.resist * 100).toFixed(0)}%`,
    );
  });
}

function main() {
  const rosterPath = process.argv[2];
  const partySize = parseInt(process.argv[3] || "4", 10);
  const mode = process.argv[4] || "normal";
  const monsterKey = process.argv[5] || "ruinguard";

  if (!rosterPath) {
    console.error(
      "❌ 사용법: node configGenerator.js <로스터JSON경로> [파티크기=4] [모드] [몬스터키]",
    );
    console.error("");
    console.error("  모드: fast | normal | safe");
    console.error("  몬스터키: --list 로 목록 확인");
    listMonsters();
    process.exit(1);
  }

  // --list 옵션
  if (rosterPath === "--list") {
    listMonsters();
    process.exit(0);
  }

  if (!MODE_OPTIONS[mode]) {
    console.error(`❌ 알 수 없는 모드: ${mode}`);
    console.error(`   사용 가능: fast, normal, safe`);
    process.exit(1);
  }

  if (!MONSTERS[monsterKey]) {
    console.error(`❌ 알 수 없는 몬스터: ${monsterKey}`);
    listMonsters();
    process.exit(1);
  }

  const absPath = path.resolve(rosterPath);
  if (!fs.existsSync(absPath)) {
    console.error("❌ 파일 없음:", absPath);
    process.exit(1);
  }

  const roster = JSON.parse(fs.readFileSync(absPath, "utf-8"));
  if (!Array.isArray(roster) || roster.length === 0) {
    console.error("❌ 로스터가 비어있거나 형식이 잘못되었습니다.");
    process.exit(1);
  }

  const monster = MONSTERS[monsterKey];

  console.log(`📋 캐릭터 ${roster.length}명 로드됨`);
  roster.forEach((c, i) =>
    console.log(`  [${i + 1}] ${c.key} (Lv.${c.level})`),
  );

  console.log(`\n⚙️  모드: ${mode} (${MODE_OPTIONS[mode]})`);
  console.log(
    `🐉 몬스터: ${monster.nameKr} (HP ${monster.hp.toLocaleString()}, 저항 ${(monster.resist * 100).toFixed(0)}%)`,
  );

  const CANDIDATE_LIMIT = 8;
  const candidateKeys = roster.slice(0, CANDIDATE_LIMIT).map((c) => c.key);

  console.log(
    `\n🎯 후보 ${candidateKeys.length}명 중 ${partySize}명 조합 생성...`,
  );
  const combos = combinations(candidateKeys, partySize);
  console.log(`   조합 개수: ${combos.length}개`);

  const outDir = path.join(__dirname, "output", "configs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let saved = 0;
  for (const combo of combos) {
    const config = generateConfig(roster, combo, mode, monsterKey);
    const fileName = `config_${combo.join("_")}.txt`;
    fs.writeFileSync(path.join(outDir, fileName), config, "utf-8");
    saved++;
  }

  console.log(`\n💾 ${saved}개 config 저장: ${outDir}`);
  console.log(`\n=== 첫 번째 config 미리보기 (${combos[0].join(" + ")}) ===\n`);
  console.log(
    generateConfig(roster, combos[0], mode, monsterKey).slice(0, 1000) +
      "\n... (생략)",
  );
}

module.exports = {
  generateConfig,
  characterToGcsim,
  mapStatType,
  mapSlot,
  resolveCharacterName,
  MODE_OPTIONS,
  MONSTERS,
};

if (require.main === module) {
  main();
}
