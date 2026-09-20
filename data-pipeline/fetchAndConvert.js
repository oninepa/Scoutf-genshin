// fetchAndConvert.js
const fs = require("fs");
const path = require("path");
const { EnkaClient } = require("enka-network-api");

// 안전하게 원시값만 꺼내기
function safe(v) {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean") return v;
  if (t !== "object") return null;
  if (typeof v.get === "function") {
    try {
      return v.get("kr") || v.get("en") || null;
    } catch (e) {
      return null;
    }
  }
  if ("value" in v && typeof v.value !== "object") return v.value;
  return null;
}

function statEntry(s) {
  if (!s) return null;
  return {
    type: s.fightProp || null,
    value: safe(s.value),
    isPercent: !!s.isPercent,
  };
}

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error("❌ UID 필요");
    process.exit(1);
  }

  console.log(`⏳ UID ${uid} 조회 중...`);
  const enka = new EnkaClient({ defaultLanguage: "kr" });

  try {
    await enka.cachedAssetsManager.fetchAllContents();
    const user = await enka.fetchUser(uid);

    const characters = user.characters;
    if (!characters || characters.length === 0) {
      console.error("❌ 캐릭터 정보 비공개");
      process.exit(1);
    }
    console.log(`✅ 캐릭터 ${characters.length}명 발견.`);

    const roster = characters.map((c) => {
      const cd = c.characterData || {};
      const w = c.weapon;
      const skills = Array.isArray(c.skillLevels) ? c.skillLevels : [];

      return {
        key: safe(cd.name),
        element: cd.element?.id || null,
        rarity: safe(cd.rarity) || safe(cd.stars),
        level: safe(c.level),
        constellation: Array.isArray(c.unlockedConstellations)
          ? c.unlockedConstellations.length
          : 0,
        friendship: safe(c.friendship),
        talent: {
          auto: skills[0]?.level?.value ?? null,
          skill: skills[1]?.level?.value ?? null,
          burst: skills[2]?.level?.value ?? null,
        },
        weapon: w
          ? {
              key: safe(w.weaponData?.name),
              level: safe(w.level),
              refinement: safe(w.refinementRank),
              ascension: safe(w.ascension),
            }
          : null,
        artifacts: (c.artifacts || []).map((a) => {
          const ad = a.artifactData || {};
          const subs = Array.isArray(a.substats?.total)
            ? a.substats.total.map(statEntry).filter(Boolean)
            : [];

          return {
            setName: safe(ad.set?.name),
            slot: ad.equipType || null,
            mainStat: statEntry(a.mainstat),
            level: safe(a.level),
            rarity: safe(ad.stars),
            substats: subs,
          };
        }),
      };
    });

    const outDir = path.join(__dirname, "output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = path.join(outDir, `roster_${uid}.json`);
    fs.writeFileSync(outPath, JSON.stringify(roster, null, 2), "utf-8");

    console.log(`💾 저장: ${outPath}`);
  } catch (err) {
    console.error("❌ 에러:", err.message);
    process.exit(1);
  }
}

main();
