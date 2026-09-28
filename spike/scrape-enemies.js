// spike/scrape-enemies.js
// HoYoWiki API로 적 목록 수집 → enemies.json에 누락된 적만 추가

const fs = require("fs");
const path = require("path");

const ENEMIES_PATH = path.join(__dirname, "output", "enemies.json");

function toKey(nameEn) {
  if (!nameEn) return null;
  return nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

async function main() {
  console.log("🔍 HoYoWiki API로 적 목록 수집 중...");

  const { Enemy, setLanguage, Language } = require("@gonetone/hoyowiki-api");
  await setLanguage(Language.Korean);

  const enemy = new Enemy();
  const list = await enemy.getList();
  console.log(`✅ ${list.length}개 적 수집됨`);

  // 기존 enemies.json 로드
  let existing = {};
  if (fs.existsSync(ENEMIES_PATH)) {
    existing = JSON.parse(fs.readFileSync(ENEMIES_PATH, "utf-8"));
    console.log(`📂 기존 enemies.json: ${Object.keys(existing).length}개`);
  }

  // 기존 한국어 이름 set (중복 방지)
  const existingKrNames = new Set(
    Object.values(existing)
      .map((e) => e.nameKr)
      .filter(Boolean),
  );

  // 각 항목의 상세 정보 가져오기 (병렬, 10개씩)
  console.log("📥 상세 정보 수집 중...");
  const detailed = [];
  for (let i = 0; i < list.length; i += 10) {
    const chunk = list.slice(i, i + 10);
    const results = await Promise.all(
      chunk.map(async (item) => {
        try {
          const detail = await enemy.get(item.id);
          return { ...item, ...detail };
        } catch {
          return item;
        }
      }),
    );
    detailed.push(...results);
    if ((i + 10) % 50 === 0) {
      console.log(`   ${Math.min(i + 10, list.length)}/${list.length}`);
    }
  }

  // 누락된 적만 추가
  let added = 0;
  let skipped = 0;
  for (const item of detailed) {
    const nameKr = item.name || "";
    const nameEn = item.nameEn || item.name_en || "";

    // 한국어 이름으로 중복 체크
    if (existingKrNames.has(nameKr)) {
      skipped++;
      continue;
    }

    const key = toKey(nameEn) || `unknown_${added}`;

    // key 충돌 방지
    let finalKey = key;
    let n = 1;
    while (existing[finalKey]) {
      finalKey = `${key}_${n++}`;
    }

    existing[finalKey] = {
      nameKr,
      nameEn,
      type: "unknown",
      region: "unknown",
      level: 100,
      hp: 0,
      resistances: {
        phys: 0.1,
        pyro: 0.1,
        hydro: 0.1,
        electro: 0.1,
        cryo: 0.1,
        anemo: 0.1,
        geo: 0.1,
        dendro: 0.1,
      },
      weaknesses: [],
      mechanics: [],
      tips: "",
      _needsUpdate: true,
    };
    existingKrNames.add(nameKr);
    added++;
  }

  fs.writeFileSync(ENEMIES_PATH, JSON.stringify(existing, null, 2), "utf-8");
  console.log(`\n✅ ${added}개 추가됨`);
  console.log(`⏭️  ${skipped}개 중복 스킵`);
  console.log(`📊 총 ${Object.keys(existing).length}개`);
  console.log(`\n⚠️  _needsUpdate: true 항목은 수동 보충 필요`);
}

main().catch((e) => {
  console.error("❌ 오류:", e.message);
  process.exit(1);
});
