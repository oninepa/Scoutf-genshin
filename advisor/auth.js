// advisor/auth.js
// Pointip-Free — Supabase Auth 래퍼

const { supabase } = require("./supabase");

// ============================================================
// 회원가입
// ============================================================
async function register(email, password, nickname = "") {
  if (!email || !password) {
    return { ok: false, message: "이메일과 비밀번호를 입력하세요." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "이메일 형식이 아닙니다." };
  }
  if (password.length < 6) {
    return { ok: false, message: "비밀번호는 6자 이상이어야 합니다." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname } },
  });

  if (error) return { ok: false, message: error.message };

  const user = { id: data.user?.id, email: data.user?.email };
  const session = data.session
    ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      }
    : null;

  if (session) saveSession(user, session);

  return {
    ok: true,
    user,
    session,
    needsConfirm: !data.session,
  };
}

// ============================================================
// 로그인
// ============================================================
async function login(email, password) {
  if (!email || !password) {
    return { ok: false, message: "이메일과 비밀번호를 입력하세요." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { ok: false, message: error.message };

  await touchLogin(data.user.id);

  const user = { id: data.user.id, email: data.user.email };
  const session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };

  // 서버에 세션 저장
  saveSession(user, session);

  return { ok: true, user, session };
}
// ============================================================
// 로그아웃
// ============================================================
async function logout(accessToken) {
  if (!accessToken) return { ok: true };
  try {
    await supabase.auth.admin.signOut(accessToken);
  } catch {}
  return { ok: true };
}

// ============================================================
// 토큰으로 사용자 확인
// ============================================================
async function getUser(accessToken) {
  if (!accessToken) return null;
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

// ============================================================
// 프로필 조회
// ============================================================
async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

// ============================================================
// 로그인 시각 업데이트
// ============================================================
async function touchLogin(userId) {
  if (!userId) return;
  try {
    await supabase
      .from("users_profile")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);
  } catch {}
}
// ============================================================
// 세션 파일 저장 (단일 사용자용)
// ============================================================
const fs = require("fs");
const path = require("path");
const SESSION_FILE = path.join(__dirname, "auth", "session.json");

function saveSession(user, session) {
  try {
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(
      SESSION_FILE,
      JSON.stringify(
        {
          user,
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          saved_at: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.warn("[auth] 세션 저장 실패:", e.message);
  }
}

function loadSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
    // 만료 체크
    if (data.expires_at && data.expires_at * 1000 < Date.now()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch {}
}
// ============================================================
// 구글 OAuth URL 생성
// ============================================================
async function getGoogleAuthUrl(
  redirectTo = "http://localhost:1420/play.html",
) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, url: data.url };
}

// ============================================================
// OAuth 콜백 처리 (code → session)
// ============================================================
async function exchangeCodeForSession(code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return { ok: false, message: error.message };

  const user = { id: data.user.id, email: data.user.email };
  const session = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  };

  // 서버 세션 저장
  saveSession(user, session);
  return { ok: true, user, session };
}
// ============================================================
// 프로필 수정 (닉네임 등)
// ============================================================
async function updateProfile(userId, data) {
  if (!userId) return { ok: false, message: "유저 ID 없음" };

  const allowed = {};
  if (data.nickname !== undefined) allowed.nickname = data.nickname;

  if (Object.keys(allowed).length === 0) {
    return { ok: false, message: "수정할 항목 없음" };
  }

  const { data: updated, error } = await supabase
    .from("users_profile")
    .update(allowed)
    .eq("id", userId)
    .select()
    .single();

  if (error) return { ok: false, message: error.message };
  return { ok: true, profile: updated };
}

// ============================================================
// 원신 UID 등록/수정
// ============================================================
async function saveGenshinUid(userId, uid, nickname = "", server = "") {
  if (!userId) return { ok: false, message: "유저 ID 없음" };
  if (!/^\d{9}$/.test(uid)) {
    return { ok: false, message: "UID는 9자리 숫자입니다." };
  }

  // 기존 UID 있으면 업데이트, 없으면 삽입
  const { data: existing } = await supabase
    .from("genshin_uids")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("genshin_uids")
      .update({ uid, nickname, server, is_primary: true })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, uid: data };
  } else {
    const { data, error } = await supabase
      .from("genshin_uids")
      .insert({ user_id: userId, uid, nickname, server, is_primary: true })
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    return { ok: true, uid: data };
  }
}
// ============================================================
// 원신 UID 조회
// ============================================================
async function getGenshinUid(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("genshin_uids")
    .select("*")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) return null;
  return data;
}
module.exports = {
  register,
  login,
  logout,
  getUser,
  getProfile,
  touchLogin,
  saveSession,
  loadSession,
  clearSession,
  getGoogleAuthUrl,
  exchangeCodeForSession,
  updateProfile, // ← 추가
  saveGenshinUid, // ← 추가
  getGenshinUid, // ← 추가
};
