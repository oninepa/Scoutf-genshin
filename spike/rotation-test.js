// rotation-test.js
// 플린스 파티 로테이션 3가지 비교
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const GCSIM = path.join(__dirname, "gcsim.exe");
const BASE_CONFIG = path.join(
  __dirname,
  "output",
  "configs",
  "config_플린스_여행자_설탕_아이노_en.txt",
);

// 기본 config에서 로테이션 부분만 교체
function buildConfig(rotation) {
  let base = fs.readFileSync(BASE_CONFIG, "utf-8");
  // 테스트용으로 iteration 줄이기 (빠른 비교)
  base = base.replace(/iteration=\d+/, "iteration=50");
  const idx = base.indexOf("# 로테이션");
  if (idx === -1) throw new Error("로테이션 섹션 없음");
  return base.slice(0, idx) + rotation;
}

function parseDps(stdout) {
  const m = stdout.match(/resulting in ([\d.]+) dps/);
  return m ? parseFloat(m[1]) : null;
}

const rotations = {
  "A. 폴백 (1사이클)": `# 로테이션 A
active flins;
flins skill;
travelerhydro skill;
sucrose skill;
aino skill;
flins burst;
travelerhydro burst;
sucrose burst;
aino burst;
`,
  "B. 폴백 x3 사이클": `# 로테이션 B
active flins;
for let i = 0; i < 3; i = i + 1 {
  flins skill;
  travelerhydro skill;
  sucrose skill;
  aino skill;
  flins burst;
  travelerhydro burst;
  sucrose burst;
  aino burst;
}
`,
  "C. 서포터 버스트 먼저, 딜러 나중 (3사이클)": `# 로테이션 C
active flins;
for let i = 0; i < 3; i = i + 1 {
  travelerhydro skill, burst;
  sucrose skill, burst;
  aino skill, burst;
  flins skill, burst, attack:5;
}
`,
};

const tmpPath = path.join(__dirname, "output", "configs", "_test.txt");
const results = {};

for (const [name, rotation] of Object.entries(rotations)) {
  const config = buildConfig(rotation);
  fs.writeFileSync(tmpPath, config, "utf-8");
  process.stdout.write(`\n[${name}] 실행 중...\n`);
  try {
    const stdout = execFileSync(GCSIM, ["-c", tmpPath], {
      encoding: "utf-8",
      timeout: 600000,
    });
    const dps = parseDps(stdout);
    results[name] = dps;
    console.log(`  → ${dps} dps`);
  } catch (err) {
    results[name] = null;
    console.log(`  ❌ 실패: ${(err.stdout || err.message).slice(0, 200)}`);
  }
}

console.log("\n=== 결과 ===");
Object.entries(results).forEach(([name, dps]) => {
  console.log(`  ${name}: ${dps || "실패"}`);
});

if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
