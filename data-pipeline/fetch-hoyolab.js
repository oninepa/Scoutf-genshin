// fetch-hoyolab.js
// 사용법: node fetch-hoyolab.js "<ltmid>|<ltuid>|<ltoken>" <UID>

const { GenshinImpact, GenshinRegion } = require("node-hoyolab");

async function main() {
  const arg = process.argv[2];
  const uidStr = process.argv[3];

  if (!arg || !uidStr) {
    console.error(
      '❌ 사용법: node fetch-hoyolab.js "<ltmid>|<ltuid>|<ltoken>" <UID>',
    );
    process.exit(1);
  }

  const [ltmid, ltuid, ltoken] = arg.split("|");
  if (!ltmid || !ltuid || !ltoken) {
    console.error("❌ 세 값이 모두 필요합니다. 형식: ltmid|ltuid|ltoken");
    process.exit(1);
  }

  const gi = new GenshinImpact({
    cookie: {
      ltuid: parseInt(ltuid, 10),
      ltoken: ltoken,
      cookieTokenV2: ltoken,
    },
    uid: parseInt(uidStr, 10),
    region: GenshinRegion.ASIA,
    lang: "ko-kr",
  });

  try {
    console.log("⏳ HoYoLab 데이터 조회 중...\n");

    // 1. 일일 노트 (레진, 파견, 비경 등)
    console.log("=== 1. 일일 노트 ===");
    try {
      const note = await gi.record.dailyNote();
      console.log(JSON.stringify(note, null, 2));
    } catch (e) {
      console.error("일일 노트 에러:", e.message);
    }

    // 2. 나선비경
    console.log("\n=== 2. 나선비경 ===");
    try {
      const abyss = await gi.record.spiralAbyss();
      console.log(JSON.stringify(abyss, null, 2));
    } catch (e) {
      console.error("나선비경 에러:", e.message);
    }

    // 3. 원석 일기
    console.log("\n=== 3. 원석 일기 ===");
    try {
      const diary = await gi.diary.list();
      console.log(JSON.stringify(diary, null, 2));
    } catch (e) {
      console.error("일기 에러:", e.message);
    }
  } catch (err) {
    console.error("❌ 전체 에러:", err.message);
    console.error(err.stack);
  }
}

main();
