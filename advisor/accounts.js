// advisor/accounts.js
// Pointip-Free — 계정 관리 (최대 2개 UID)

const fs = require("fs");
const path = require("path");

const ACCOUNTS_DIR = path.join(__dirname, "accounts");
const MAX_ACCOUNTS = 2;

// ============================================================
// 서버 자동 감지 (UID 첫 자리)
// ============================================================
function detectServer(uid) {
  if (!uid) return null;
  const first = String(uid)[0];
  const map = {
    1: { code: "cn_gf01", name: "중국 (관복)" },
    5: { code: "cn_qd01", name: "중국 (채널복)" },
    6: { code: "os_usa", name: "미국" },
    7: { code: "os_euro", name: "유럽" },
    8: { code: "os_asia", name: "아시아" },
    9: { code: "os_cht", name: "대만/홍콩/마카오" },
  };
  return map[first] || null;
}

// ============================================================
// 폴더 초기화 (없으면 5개 다 생성)
// ============================================================
function ensureDirs() {
  fs.mkdirSync(ACCOUNTS_DIR, { recursive: true });
  for (let i = 1; i <= MAX_ACCOUNTS; i++) {
    const dir = path.join(ACCOUNTS_DIR, `account_${i}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================================
// 개별 계정 로드
// ============================================================
function loadAccount(n) {
  const file = path.join(ACCOUNTS_DIR, `account_${n}`, "account.json");
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw);
    return { index: n, ...data };
  } catch {
    return {
      index: n,
      name: "",
      uid: "",
      server: null,
      hasCookie: false,
    };
  }
}

// ============================================================
// 전체 로드
// ============================================================
function loadAll() {
  ensureDirs();
  migrateEnvToAccount1();
  const list = [];
  for (let i = 1; i <= MAX_ACCOUNTS; i++) {
    const acc = loadAccount(i);
    const cookieFile = path.join(ACCOUNTS_DIR, `account_${i}`, "cookie.txt");
    acc.hasCookie = fs.existsSync(cookieFile);
    list.push(acc);
  }
  return list;
}

// ============================================================
// 개별 저장
// ============================================================
function saveAccount(n, data) {
  const dir = path.join(ACCOUNTS_DIR, `account_${n}`);
  fs.mkdirSync(dir, { recursive: true });

  const uid = String(data.uid || "").trim();
  const server = uid ? detectServer(uid) : null;

  const account = {
    name: (data.name || "").trim(),
    uid,
    server,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(dir, "account.json"),
    JSON.stringify(account, null, 2),
  );

  return {
    index: n,
    ...account,
    hasCookie: fs.existsSync(path.join(dir, "cookie.txt")),
  };
}

// ============================================================
// 쿠키 저장
// ============================================================
function saveCookie(n, cookie) {
  const dir = path.join(ACCOUNTS_DIR, `account_${n}`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "cookie.txt");
  if (cookie && cookie.trim()) {
    fs.writeFileSync(file, cookie.trim());
    return true;
  } else {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return false;
  }
}

// ============================================================
// 쿠키 로드
// ============================================================
function loadCookie(n) {
  try {
    const file = path.join(ACCOUNTS_DIR, `account_${n}`, "cookie.txt");
    return fs.readFileSync(file, "utf-8").trim();
  } catch {
    return null;
  }
}

// ============================================================
// 삭제
// ============================================================
function deleteAccount(n) {
  const dir = path.join(ACCOUNTS_DIR, `account_${n}`);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// .env → 계정 1 자동 이관 (최초 1회)
// ============================================================
function migrateEnvToAccount1() {
  const cookieFile = path.join(ACCOUNTS_DIR, "account_1", "cookie.txt");
  const accountFile = path.join(ACCOUNTS_DIR, "account_1", "account.json");

  // 이미 쿠키 있으면 skip
  if (fs.existsSync(cookieFile)) return false;

  const envPath = path.join(__dirname, "..", "data-pipeline", ".env");
  if (!fs.existsSync(envPath)) return false;

  try {
    const env = fs.readFileSync(envPath, "utf-8");
    const ltuid = env.match(/HOYOLAB_LTUID\s*=\s*(.+)/)?.[1]?.trim();
    const ltoken = env.match(/HOYOLAB_LTOKEN\s*=\s*(.+)/)?.[1]?.trim();
    const uid = env.match(/GENSHIN_UID\s*=\s*(.+)/)?.[1]?.trim();

    if (!ltuid || !ltoken) return false;

    // 쿠키 저장
    fs.mkdirSync(path.dirname(cookieFile), { recursive: true });
    fs.writeFileSync(cookieFile, `ltoken_v2=${ltoken}; ltuid_v2=${ltuid};`);

    // 계정 정보도 자동 채움 (UID 있으면)
    if (uid && !fs.existsSync(accountFile)) {
      const server = detectServer(uid);
      fs.writeFileSync(
        accountFile,
        JSON.stringify(
          {
            name: "기본 계정",
            uid,
            server,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
      );
    }
    return true;
  } catch {
    return false;
  }
}
// ============================================================
// 계정별 프로필
// ============================================================
function getProfilePath(n) {
  return path.join(ACCOUNTS_DIR, `account_${n}`, "profile.json");
}

function loadProfile(n) {
  const file = getProfilePath(n);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function saveProfile(n, data) {
  const dir = path.join(ACCOUNTS_DIR, `account_${n}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getProfilePath(n), JSON.stringify(data, null, 2));
  return data;
}

module.exports = {
  detectServer,
  loadAll,
  loadAccount,
  saveAccount,
  saveCookie,
  loadCookie,
  deleteAccount,
  migrateEnvToAccount1,
  getProfilePath,
  loadProfile,
  saveProfile,
  MAX_ACCOUNTS,
};
