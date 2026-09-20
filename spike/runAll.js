// runAll.js
// 사용법: node runAll.js
// output/configs/*_en.txt 를 전부 gcsim으로 실행 → results.json 저장

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const CONFIG_DIR = path.join(__dirname, "output", "configs");
const GCSIM = path.join(__dirname, "gcsim.exe");
const OUT_JSON = path.join(__dirname, "output", "results.json");

// === 진행률 표시용 ===
const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerIdx = 0;

function fmtTime(sec) {
  if (sec < 60) return `${sec.toFixed(0)}초`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}분 ${s}초`;
}

function drawProgress(done, total, currentName, elapsed, eta) {
  const pct = ((done / total) * 100).toFixed(0);
  const barLen = 30;
  const filled = Math.round((done / total) * barLen);
  const bar = "█".repeat(filled) + "░".repeat(barLen - filled);

  const spinner = SPINNER[spinnerIdx % SPINNER.length];
  const line1 = `\r${spinner} [${bar}] ${done}/${total} (${pct}%)`;
  const line2 = currentName ? `  현재: ${currentName.slice(0, 40)}` : "";
  const line3 = `  경과: ${fmtTime(elapsed)} | 남은 예상: ${fmtTime(eta)}`;

  // 커서 맨 위로 올리고 3줄 다시 그림
  process.stdout.write(`\x1b[3A\x1b[0J`);
  process.stdout.write(line1 + "\n");
  process.stdout.write((line2 || "  ") + "\n");
  process.stdout.write((line3 || "  ") + "\n");
}

function clearProgress() {
  process.stdout.write(`\x1b[3A\x1b[0J`);
}

function startSpinner() {
  return setInterval(() => {
    spinnerIdx++;
  }, 80);
}

// gcsim 출력 파싱
function parseResult(stdout) {
  const dpsMatch = stdout.match(/resulting in ([\d.]+) dps/);
  const dmgMatch = stdout.match(/Average ([\d.]+) damage/);
  const durMatch = stdout.match(/Average duration of ([\d.]+) seconds/);
  const iterMatch = stdout.match(/completed (\d+) iterations/);
  return {
    dps: dpsMatch ? parseFloat(dpsMatch[1]) : null,
    damage: dmgMatch ? parseFloat(dmgMatch[1]) : null,
    duration: durMatch ? parseFloat(durMatch[1]) : null,
    iterations: iterMatch ? parseInt(iterMatch[1], 10) : null,
  };
}

// 단일 config 실행 (Promise)
function runOne(fullPath) {
  return new Promise((resolve) => {
    execFile(
      GCSIM,
      ["-c", fullPath],
      { encoding: "utf-8", timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          resolve({
            error: (
              (stdout || "") +
              (stderr || "") +
              (err.message || "")
            ).slice(0, 200),
          });
          return;
        }
        resolve(parseResult(stdout));
      },
    );
  });
}

async function main() {
  if (!fs.existsSync(GCSIM)) {
    console.error("❌ gcsim.exe 없음:", GCSIM);
    process.exit(1);
  }

  const files = fs.readdirSync(CONFIG_DIR).filter((f) => f.endsWith("_en.txt"));

  if (files.length === 0) {
    console.error("❌ 변환된 _en.txt 파일이 없습니다.");
    process.exit(1);
  }

  console.log(`🚀 ${files.length}개 config 실행 시작...\n`);

  const total = files.length;
  const results = [];
  const startTime = Date.now();
  const times = []; // 각 실행 소요시간 (ETA용)

  // 진행률 초기 3줄 예약
  process.stdout.write("\n\n\n");
  const spinner = startSpinner();

  let done = 0;
  let failed = 0;

  for (const f of files) {
    const fullPath = path.join(CONFIG_DIR, f);
    const partyName = f.replace(/^config_/, "").replace(/_en\.txt$/, "");

    const fileStart = Date.now();

    // 진행률 표시 (실행 중)
    const elapsed = (Date.now() - startTime) / 1000;
    const avgTime =
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 3;
    const eta = avgTime * (total - done);
    drawProgress(done, total, partyName, elapsed, eta);

    const parsed = await runOne(fullPath);
    const fileTime = (Date.now() - fileStart) / 1000;
    times.push(fileTime);

    if (parsed.error) {
      failed++;
      results.push({ file: f, party: partyName, error: parsed.error });
    } else {
      results.push({ file: f, party: partyName, ...parsed });
      done++;
    }
  }

  clearInterval(spinner);
  clearProgress();

  // DPS 내림차순 (에러는 뒤로)
  results.sort((a, b) => (b.dps || -1) - (a.dps || -1));

  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2), "utf-8");

  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`✅ 완료: 성공 ${done}개, 실패 ${failed}개`);
  console.log(`⏱️  총 소요: ${fmtTime(totalTime)}`);
  console.log(`💾 저장: ${OUT_JSON}`);

  console.log("\n=== 🏆 TOP 10 ===");
  results.slice(0, 10).forEach((r, i) => {
    if (r.dps) {
      console.log(`  ${i + 1}. ${r.party} → ${r.dps} dps`);
    } else {
      console.log(`  ${i + 1}. ${r.party} → (실패)`);
    }
  });
}

main();
