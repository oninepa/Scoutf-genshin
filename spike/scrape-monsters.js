// scrape-monsters.js
// gcsim Docs에서 몬스터 데이터 수집
// 사용법: node scrape-monsters.js

const fs = require("fs");
const path = require("path");

// 수집할 몬스터 (URL 슬러그)
const MONSTERS = [
  { slug: "ruinguard", nameKr: "폐허 수호자" },
  { slug: "ruinhunter", nameKr: "폐허 사냥꾼" },
  { slug: "ruindestroyer", nameKr: "폐허 파괴자" },
  { slug: "ruincruiser", nameKr: "폐허 순항자" },
  { slug: "ruindefender", nameKr: "폐허 수비자" },
  { slug: "ruinscout", nameKr: "폐허 정찰자" },
  { slug: "ruinserpent", nameKr: "폐허 뱀" },
  { slug: "largeanemoslime", nameKr: "큰 바람 슬라임" },
  { slug: "largecryoslime", nameKr: "큰 얼음 슬라임" },
  { slug: "largeelectroslime", nameKr: "큰 번개 슬라임" },
  { slug: "largehydroslime", nameKr: "큰 물 슬라임" },
  { slug: "largepyroslime", nameKr: "큰 불 슬라임" },
  { slug: "largegeoslime", nameKr: "큰 바위 슬라임" },
  { slug: "largedendroslime", nameKr: "큰 풀 슬라임" },
  { slug: "cryohypostasis", nameKr: "순수한 서리 정령" },
  { slug: "electrohypostasis", nameKr: "순수한 번개 정령" },
  { slug: "pyrohypostasis", nameKr: "순수한 불 정령" },
  { slug: "geohypostasis", nameKr: "순수한 바위 정령" },
  { slug: "anemohypostasis", nameKr: "순수한 바람 정령" },
  { slug: "hydrohypostasis", nameKr: "순수한 물 정령" },
  { slug: "dendrohypostasis", nameKr: "순수한 풀 정령" },
  { slug: "cryoregisvine", nameKr: "얼음 나무" },
  { slug: "pyroregisvine", nameKr: "불 나무" },
  { slug: "electroregisvine", nameKr: "번개 나무" },
  { slug: "geovishap", nameKr: "바위 용 도마뱀" },
  { slug: "primogeovishap", nameKr: "원시 바위 용 도마뱀" },
  { slug: "azhdaha", nameKr: "약타" },
  { slug: "stormterror", nameKr: "풍마룡" },
  { slug: "childe", nameKr: "타르탈리아" },
  { slug: "lasignora", nameKr: "시뇨라" },
  { slug: "magatsumitakenarukaminomikoto", nameKr: "마신 임무" },
  { slug: "shoukinokamitheprodigal", nameKr: "산산이 조각난 신" },
  { slug: "goldenwolflord", nameKr: "황금 늑대 왕" },
  { slug: "hydrotulpa", nameKr: "물의 화신" },
];

const BASE_URL = "https://docs.gcsim.app/reference/enemies/";
const OUT_PATH = path.join(__dirname, "output", "monsters.json");

// HTML에서 저항 데이터 추출
function extractResists(html) {
  const resists = {};
  // <code>pyro</code></td><td>10<!-- -->%</td> 패턴
  const regex = /<code>([a-z]+)<\/code><\/td><td[^>]*>(\d+)<!-- -->%/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    resists[match[1]] = parseInt(match[2], 10) / 100;
  }
  return resists;
}

// HTML에서 HP 데이터 추출 (Lv 100)
function extractHp100(html) {
  // <td>100</td><td>257356</td> 패턴
  const regex = /<td[^>]*>100<\/td><td[^>]*>(\d+)<\/td>/;
  const match = html.match(regex);
  return match ? parseInt(match[1], 10) : null;
}

// 단일 몬스터 스크래핑
async function scrapeMonster(slug) {
  const url = BASE_URL + slug;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const resists = extractResists(html);
  const hp = extractHp100(html);

  if (hp === null) throw new Error("HP 파싱 실패");

  return {
    hp,
    resist: resists.physical !== undefined ? resists.physical : 0.1,
    resists: resists,
  };
}

// 메인
async function main() {
  console.log(`🚀 ${MONSTERS.length}개 몬스터 스크래핑 시작...\n`);

  const result = {};
  let success = 0;
  let failed = 0;

  for (let i = 0; i < MONSTERS.length; i++) {
    const m = MONSTERS[i];
    const label = `[${i + 1}/${MONSTERS.length}] ${m.nameKr} (${m.slug})`;
    process.stdout.write(`${label} ... `);

    try {
      const data = await scrapeMonster(m.slug);
      result[m.slug] = {
        nameKr: m.nameKr,
        nameEn: m.slug,
        ...data,
      };
      success++;
      console.log(`✅ HP ${data.hp}, physical ${data.resists.physical}`);
    } catch (e) {
      failed++;
      console.log(`❌ ${e.message}`);
    }

    // 서버 부담 줄이기
    await new Promise((r) => setTimeout(r, 200));
  }

  // 저장
  if (!fs.existsSync(path.dirname(OUT_PATH))) {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), "utf-8");

  console.log(`\n✅ 완료: 성공 ${success}개, 실패 ${failed}개`);
  console.log(`💾 저장: ${OUT_PATH}`);

  // 실패 목록 출력
  if (failed > 0) {
    console.log("\n실패한 몬스터는 슬러그가 잘못됐을 수 있습니다.");
    console.log("gcsim docs에서 정확한 URL을 확인해주세요.");
  }
}

main().catch((e) => {
  console.error("❌ 전체 에러:", e.message);
  process.exit(1);
});
