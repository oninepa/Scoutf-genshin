// advisor/auth.js
// Pointip-Free — 로컬 인증 (임시, 나중에 서버로 교체)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const AUTH_DIR = path.join(__dirname, "auth");
const USER_FILE = path.join(AUTH_DIR, "user.json");
const SESSION_FILE = path.join(AUTH_DIR, "session.json");

// ============================================================
// 해시
// ============================================================
function hashPassword(password, salt) {
  return crypto
    .createHash("sha256")
    .update(salt + ":" + password)
    .digest("hex");
}

// ============================================================
// 사용자 존재 확인
// ============================================================
function hasUser() {
  try {
    return fs.existsSync(USER_FILE);
  } catch {
    return false;
  }
}

// ============================================================
// 회원가입
// ============================================================
function register(email, password) {
  if (!email || !password) {
    return { ok: false, message: "이메일과 비밀번호를 입력하세요." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "이메일 형식이 아닙니다." };
  }
  if (password.length < 6) {
    return { ok: false, message: "비밀번호는 6자 이상이어야 합니다." };
  }
  if (hasUser()) {
    return { ok: false, message: "이미 가입된 사용자가 있습니다." };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    USER_FILE,
    JSON.stringify(
      { email, salt, hash, createdAt: new Date().toISOString() },
      null,
      2,
    ),
  );

  // 자동 로그인
  saveSession(email);

  return { ok: true, email };
}

// ============================================================
// 로그인
// ============================================================
function login(email, password) {
  if (!email || !password) {
    return { ok: false, message: "이메일과 비밀번호를 입력하세요." };
  }
  if (!hasUser()) {
    return { ok: false, message: "가입된 사용자가 없습니다." };
  }

  let user;
  try {
    user = JSON.parse(fs.readFileSync(USER_FILE, "utf-8"));
  } catch {
    return { ok: false, message: "사용자 정보를 읽을 수 없습니다." };
  }

  if (user.email !== email) {
    return { ok: false, message: "이메일 또는 비밀번호가 틀렸습니다." };
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.hash) {
    return { ok: false, message: "이메일 또는 비밀번호가 틀렸습니다." };
  }

  saveSession(email);
  return { ok: true, email };
}

// ============================================================
// 세션
// ============================================================
function saveSession(email) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(
    SESSION_FILE,
    JSON.stringify({ email, at: new Date().toISOString() }, null, 2),
  );
}

function getSession() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function logout() {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// Export
// ============================================================
module.exports = {
  hasUser,
  register,
  login,
  getSession,
  logout,
};
