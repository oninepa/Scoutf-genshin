// translateConfig.js
// 한국어 config를 gcsim 영어 config로 변환
// 사용법: node translateConfig.js <입력config경로>
// 예시:   node translateConfig.js output\configs\config_다이루크_케이아_플린스_야란.txt

const fs = require("fs");
const path = require("path");

// 캐시 무시하고 매번 새로 읽기
delete require.cache[require.resolve("./nameMap.json")];
const map = require("./nameMap.json");

function translateLine(line) {
  let result = line;

  // 캐릭터 이름 변환 (한국어 → 영어)
  for (const [kr, en] of Object.entries(map.characters)) {
    // 단어 경계로 정확히 매칭 (문장 어디에 있든)
    const re = new RegExp(kr, "g");
    result = result.replace(re, en);
  }

  // 무기 이름 변환
  for (const [kr, en] of Object.entries(map.weapons)) {
    const re = new RegExp(kr, "g");
    result = result.replace(re, en);
  }

  // 성유물 세트 이름 변환
  for (const [kr, en] of Object.entries(map.artifacts)) {
    const re = new RegExp(kr, "g");
    result = result.replace(re, en);
  }

  // 스탯 키 변환
  for (const [kr, en] of Object.entries(map.stats)) {
    const re = new RegExp(kr, "g");
    result = result.replace(re, en);
  }

  // 슬롯 이름 변환
  for (const [kr, en] of Object.entries(map.slots)) {
    const re = new RegExp(kr, "g");
    result = result.replace(re, en);
  }

  return result;
}

function translateFile(absIn) {
  const input = fs.readFileSync(absIn, "utf-8");
  const lines = input.split("\n");
  const translated = lines
    .map(translateLine)
    .map((line) => {
      const trimmed = line.trimEnd();
      if (!trimmed) return "";
      if (trimmed.startsWith("#")) return trimmed;
      if (trimmed.endsWith(";")) return trimmed;
      if (trimmed.endsWith("{")) return trimmed;
      return trimmed + ";";
    })
    .join("\n");

  const parsed = path.parse(absIn);
  const outPath = path.join(parsed.dir, `${parsed.name}_en${parsed.ext}`);
  fs.writeFileSync(outPath, translated, "utf-8");
  return outPath;
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("❌ 사용법:");
    console.error("  파일 1개: node translateConfig.js <config파일경로>");
    console.error("  폴더 전체: node translateConfig.js <config폴더경로>");
    process.exit(1);
  }

  const absIn = path.resolve(inputPath);
  if (!fs.existsSync(absIn)) {
    console.error("❌ 경로 없음:", absIn);
    process.exit(1);
  }

  const stat = fs.statSync(absIn);

  // === 폴더 모드 ===
  if (stat.isDirectory()) {
    const files = fs
      .readdirSync(absIn)
      .filter((f) => f.endsWith(".txt") && !f.endsWith("_en.txt"));

    if (files.length === 0) {
      console.error("❌ 폴더 안에 변환할 .txt 파일이 없습니다:", absIn);
      process.exit(1);
    }

    console.log(`📂 폴더 모드: ${files.length}개 파일 변환 시작...\n`);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const f of files) {
      const filePath = path.join(absIn, f);
      try {
        translateFile(filePath);
        success++;
        process.stdout.write(`  [${success}/${files.length}] ${f}\n`);
      } catch (err) {
        failed++;
        errors.push({ file: f, error: err.message });
        process.stdout.write(`  ❌ 실패: ${f} (${err.message})\n`);
      }
    }

    console.log(`\n✅ 완료: 성공 ${success}개, 실패 ${failed}개`);
    if (errors.length > 0) {
      console.log("\n=== 실패 목록 ===");
      errors.forEach((e) => console.log(`  - ${e.file}: ${e.error}`));
    }
    return;
  }

  // === 파일 1개 모드 (기존 동작) ===
  const outPath = translateFile(absIn);
  console.log(`✅ 변환 완료: ${outPath}`);
  const translated = fs.readFileSync(outPath, "utf-8");
  console.log("\n=== 변환 결과 미리보기 ===\n");
  console.log(translated.slice(0, 800) + "\n...(생략)");
}

main();
