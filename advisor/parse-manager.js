// advisor/parse-manager.js
// Pointip-Free — 파싱 관리 (일일 5회 제한, 2시간 간격, 05:00 KST 리셋)

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);

// ============================================================
// 경로
// ============================================================
const ADVISOR_DIR = __dirname;
const DATA_PIPELINE_DIR = path.join(ADVISOR_DIR, "..", "data-pipeline");
const CACHE_DIR = path.join(ADVISOR_DIR, "cache");
const LOG_PATH = path.join(CACHE_DIR, "parse_log.json");
const HOYOLAB_SRC = path.join(DATA_PIPELINE_DIR, "output");
const HOYOLAB_DST = path.join(CACHE_DIR, "hoyolab_latest.json");
const ROSTER_DST = path.join(CACHE_DIR, "roster_latest.json");

const MAX_PER_DAY = 5;
const AUTO_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2시간

// ============================================================
// KST 기준 오늘 날짜 (05:00 리셋)
// ============================================================
function getKstResetDate() {
  // KST = UTC + 9
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // 오전 5시 이전이면 어제 날짜로 간주 (리셋 전)
  if (kst.getUTCHours() < 5) {
    kst.setUTCDate(kst.getUTCDate() - 1);
  }
  return kst.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ============================================================
// 로그 읽기/쓰기
// ============================================================
function loadLog() {
  try {
    const raw = fs.readFileSync(LOG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { date: null, count: 0, lastParse: null, history: [] };
  }
}

function saveLog(log) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  } catch (e) {
    console.warn("[parse] 로그 저장 실패:", e.message);
  }
}

// ============================================================
// 오늘 로그 보장 (날짜 다르면 리셋)
// ============================================================
function ensureToday(log) {
  const today = getKstResetDate();
  if (log.date !== today) {
    return { date: today, count: 0, lastParse: null, history: [] };
  }
  return log;
}

// ============================================================
// 상태 조회
// ============================================================
function getStatus() {
  let log = ensureToday(loadLog());
  return {
    date: log.date,
    count: log.count,
    max: MAX_PER_DAY,
    remaining: MAX_PER_DAY - log.count,
    lastParse: log.lastParse,
    canParse: log.count < MAX_PER_DAY,
    history: log.history || [],
  };
}

// ============================================================
// 자동 파싱 필요 여부
// ============================================================
function shouldAutoParse() {
  const log = ensureToday(loadLog());
  if (log.count >= MAX_PER_DAY) return false;
  if (!log.lastParse) return true;

  const elapsed = Date.now() - new Date(log.lastParse).getTime();
  return elapsed >= AUTO_INTERVAL_MS;
}

// ============================================================
// 파싱 실행
// ============================================================
async function runParse(type = "manual", accountIndex = 1) {
  const log = ensureToday(loadLog());

  if (log.count >= MAX_PER_DAY) {
    return {
      ok: false,
      reason: "limit",
      message: `오늘 정보 취합 횟수 ${MAX_PER_DAY}회를 다 썼습니다. 자정(05:00)에 리셋됩니다.`,
    };
  }

  // data-pipeline/output에 hoyolab 파일이 있는지 확인
  const hoyolabSrc = path.join(HOYOLAB_SRC, `hoyolab_${acc.uid}.json`);

  try {
    // Python 스크립트 실행
    // 계정 정보 로드
    const accounts = require("./accounts");
    const acc = accounts.loadAccount(accountIndex || 1);
    const cookieStr = accounts.loadCookie(accountIndex || 1);

    if (!acc.uid) {
      return {
        ok: false,
        reason: "no_uid",
        message: `계정 ${accountIndex || 1}의 UID가 없습니다.`,
      };
    }

    // 쿠키 파싱
    let ltuid = "";
    let ltoken = "";
    if (cookieStr) {
      ltuid = cookieStr.match(/ltuid_v2=([^;]+)/)?.[1] || "";
      ltoken = cookieStr.match(/ltoken_v2=([^;]+)/)?.[1] || "";
    }

    if (!ltuid || !ltoken) {
      return {
        ok: false,
        reason: "no_cookie",
        message: `계정 ${accountIndex || 1}의 쿠키가 없습니다.`,
      };
    }

    // Python 호출 (인자 전달)
    await execFileAsync(
      "python",
      ["fetch-hoyolab.py", ltuid, ltoken, acc.uid],
      {
        cwd: DATA_PIPELINE_DIR,
        timeout: 30000,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );
  } catch (e) {
    return {
      ok: false,
      reason: "fetch_fail",
      message: `파싱 실패: ${e.message}`,
    };
  }

  // 결과 파일을 캐시로 복사
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const accountCacheDir = path.join(CACHE_DIR, `account_${accountIndex}`);
    fs.mkdirSync(accountCacheDir, { recursive: true });

    if (fs.existsSync(hoyolabSrc)) {
      fs.copyFileSync(hoyolabSrc, path.join(accountCacheDir, "hoyolab.json"));
    }
    const rosterSrc = path.join(HOYOLAB_SRC, `roster_${acc.uid}.json`);
    if (fs.existsSync(rosterSrc)) {
      fs.copyFileSync(rosterSrc, path.join(accountCacheDir, "roster.json"));
    }

    // 계정 1은 기존 캐시에도 복사 (호환)
    if (accountIndex === 1) {
      if (fs.existsSync(hoyolabSrc)) fs.copyFileSync(hoyolabSrc, HOYOLAB_DST);
      if (fs.existsSync(rosterSrc)) fs.copyFileSync(rosterSrc, ROSTER_DST);
    }
  } catch (e) {
    return {
      ok: false,
      reason: "copy_fail",
      message: `결과 복사 실패: ${e.message}`,
    };
  }

  // 로그 갱신
  const now = new Date().toISOString();
  log.count += 1;
  log.lastParse = now;
  log.history = log.history || [];
  log.history.push({ at: now, type });
  saveLog(log);

  return {
    ok: true,
    count: log.count,
    max: MAX_PER_DAY,
    remaining: MAX_PER_DAY - log.count,
    at: now,
  };
}

// ============================================================
// 수동 파싱 (🔁 버튼)
// ============================================================
async function parseManual(accountIndex = 1) {
  return await runParse("manual", accountIndex);
}

// ============================================================
// 자동 파싱 (2시간 경과 시)
// ============================================================
async function parseAuto(accountIndex = 1) {
  if (!shouldAutoParse()) {
    return { ok: false, reason: "not_needed" };
  }
  return await runParse("auto", accountIndex);
}

// ============================================================
// Export
// ============================================================
module.exports = {
  getStatus,
  shouldAutoParse,
  parseManual,
  parseAuto,
  MAX_PER_DAY,
  AUTO_INTERVAL_MS,
  getKstResetDate,
};
