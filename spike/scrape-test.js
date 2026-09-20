// scrape-test.js
async function main() {
  const url = "https://docs.gcsim.app/reference/enemies/ruinguard";
  const res = await fetch(url);
  const html = await res.text();

  // "Resist Data" 텍스트 찾기
  console.log("=== 'Resist Data' 주변 1500자 ===");
  const rdIdx = html.indexOf("Resist Data");
  if (rdIdx !== -1) {
    console.log(html.slice(rdIdx, rdIdx + 1500));
  } else {
    console.log("'Resist Data' 없음");
  }

  // 마지막 "physical" 위치 (본문일 가능성)
  console.log("\n=== 마지막 'physical' 주변 800자 ===");
  const lastPhIdx = html.lastIndexOf("physical");
  if (lastPhIdx !== -1) {
    console.log(html.slice(lastPhIdx - 400, lastPhIdx + 400));
  }
}

main();
